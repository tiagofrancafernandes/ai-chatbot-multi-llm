import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    LlmProvider,
    IntentAnalysisResult,
    IntentContext,
    PrimaryIntent,
    SecondaryRequest,
} from '../interfaces/llm-provider.interface';
import { INTENT_SYSTEM_PROMPT, evaluateFallbackIntent } from '../utils/intent-prompt';

@Injectable()
export class OllamaProvider implements LlmProvider {
    private readonly logger = new Logger(OllamaProvider.name);

    public readonly providerId = 'ollama';
    public readonly displayName = 'Ollama (Local / SystemOne)';
    public readonly defaultModel: string;
    public readonly fallbackModel: string;
    public readonly availableModels: string[];

    private readonly host: string;

    constructor(private readonly configService: ConfigService) {
        this.host = this.configService.get<string>('OLLAMA_HOST') || 'http://localhost:11434';
        this.defaultModel = this.configService.get<string>('OLLAMA_DECISION_MODEL') || 'tev1:0.8b';
        this.fallbackModel = this.configService.get<string>('OLLAMA_FALLBACK_MODEL') || 'qwen2.5:0.5b';
        this.availableModels = [
            'tev1:0.8b',
            'qwen2.5:0.5b',
            'llama3.2:1b-instruct-q4_0',
            'llama3.2:1b',
            'llama3.2:3b',
            'nimble',
        ];
    }

    public isConfigured(): boolean {
        return Boolean(this.host);
    }

    public async analyzeIntent(
        text: string,
        modelOverride?: string,
        context?: IntentContext
    ): Promise<IntentAnalysisResult> {
        if (!text) {
            return evaluateFallbackIntent('', this.providerId, context);
        }

        const lower = text.toLowerCase().trim();

        // Deterministic contract signature actions
        if (
            lower.includes('simular assinatura') ||
            lower.includes('simular contrato') ||
            lower.includes('já assinei') ||
            lower.includes('ja assinei') ||
            lower.includes('contrato assinado')
        ) {
            return evaluateFallbackIntent(text, this.providerId, context);
        }

        const model = modelOverride || this.defaultModel;

        // If target model is explicitly overridden to a specific non-tev1 model
        if (modelOverride && modelOverride !== this.defaultModel) {
            return this.analyzeWithFallbackModel(text, modelOverride, context);
        }

        // STEP 1: ALWAYS use tev1:0.8b first to analyze and try to identify intentions
        const tev1Result = await this.tryTev1Analysis(text, model);

        // Check if user text has explicit telecom action keywords that tev1 doesn't have categories for
        const hasActionClues = this.hasSubtleActionKeywords(text);

        // If tev1 returned unknown and there are no telecom action keywords, respect unknown!
        if (tev1Result && tev1Result.primaryIntent === 'unknown' && !hasActionClues && !context?.hasPendingAction) {
            return tev1Result;
        }

        // If tev1 definitively identified a standard intent without ambiguity or action sub-intents
        if (tev1Result && tev1Result.primaryIntent !== 'unknown' && !context?.hasPendingAction && !hasActionClues) {
            return tev1Result;
        }

        // STEP 2: When tev1 does not comprehend, or query involves multi-turn actions/confirmations,
        // engage lightweight model (qwen2.5:0.5b) in Ollama to analyze and extract rich intention
        this.logger.log(
            `tev1:0.8b returned "${tev1Result?.primaryIntent || 'unknown'}". Cascading to lightweight Ollama model (${this.fallbackModel}) for deep intent analysis.`
        );

        const secondaryResult = await this.analyzeWithFallbackModel(text, this.fallbackModel, context);

        return secondaryResult;
    }

    private hasSubtleActionKeywords(text: string): boolean {
        const lower = text.toLowerCase();
        const hasIdPattern = Boolean(text.match(/\b(?:\d{10,13}|\d{3}\.\d{3}\.\d{3}-\d{2})\b/));

        return (
            hasIdPattern ||
            lower.includes('mudar') ||
            lower.includes('trocar') ||
            lower.includes('mais barato') ||
            lower.includes('cancelar') ||
            lower.includes('cancela') ||
            lower.includes('endereço') ||
            lower.includes('endereco') ||
            lower.includes('mudei') ||
            lower.includes('registr') ||
            lower.includes('cadastr') ||
            lower.includes('criar conta') ||
            lower.includes('novo cliente') ||
            lower.includes('novo cadastro') ||
            lower.includes('assinar') ||
            lower.includes('contratar') ||
            lower.includes('assinei') ||
            lower.includes('simular') ||
            lower.includes('plano') ||
            lower.includes('meu plano') ||
            lower.includes('plano atual') ||
            lower.includes('qual plano') ||
            lower.includes('meus dados') ||
            lower.includes('meu cadastro') ||
            lower.includes('telefone') ||
            lower.includes('cpf') ||
            lower.includes('horário') ||
            lower.includes('horario') ||
            lower.includes('presencial') ||
            lower.includes('onde fica') ||
            lower.includes('funciona hoje') ||
            lower.includes('quarta-feira') ||
            lower.includes('quarta feira') ||
            lower.includes('cobertura') ||
            lower.includes('cajuru') ||
            lower.includes('salgados') ||
            lower.includes('fibra') ||
            lower.includes('mesh') ||
            lower.includes('link dedicado') ||
            lower.includes('wifi')
        );
    }

    private async tryTev1Analysis(text: string, model: string): Promise<IntentAnalysisResult | null> {
        const systemOnePayload = {
            model,
            state: text,
            questions: {
                primaryIntent: {
                    type: 'choice',
                    instructions: 'What is the primary intent of the user?',
                    criteria: {
                        greeting: 'Greetings or salutations like hi, hello, bom dia',
                        customer_registration:
                            'User wants to register, sign up, create an account, or open customer profile',
                        plan_subscription: 'User wants to hire, subscribe to, or choose a specific plan',
                        plan_pricing: 'Inquiries about plan prices, tiers, costs or features',
                        knowledge_inquiry:
                            'Questions about company address, location, business hours, in-person attendance, holidays or rules',
                        technical_support: 'Technical problems, system outages, errors or downtime',
                        financial: 'Invoices, bills, bank slips, pending statements or payment requests',
                        unknown: 'Unrelated queries or general text',
                    },
                },
                secondaryRequest: {
                    type: 'choice',
                    instructions: 'Is there a secondary request in the same message?',
                    criteria: {
                        none: 'No secondary request present',
                        invoice_request: 'User explicitly asks to send an invoice, bill or boleto',
                        plan_upgrade: 'User wants to upgrade or change current plan',
                    },
                },
                isClientExplicit: {
                    type: 'noul',
                    instructions: 'Did the user claim to be an active customer or provide an identifier?',
                },
            },
        };

        try {
            const systemOneUrl = `${this.host}/v1/systemone`;
            const response = await fetch(systemOneUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(systemOnePayload),
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                this.logger.warn(`Ollama /v1/systemone returned ${response.status}.`);
                return null;
            }

            const data = (await response.json()) as {
                answers?: {
                    primaryIntent?: { choice?: string; value?: string; confidence?: number };
                    secondaryRequest?: { choice?: string; value?: string };
                    isClientExplicit?: { noul?: number | string | boolean; value?: string };
                };
            };

            const rawPrimary = data.answers?.primaryIntent?.choice || data.answers?.primaryIntent?.value;
            const primaryIntent = this.normalizePrimaryIntent(rawPrimary);
            const rawConfidence = data.answers?.primaryIntent?.confidence ?? 0.92;

            const rawSecondary = data.answers?.secondaryRequest?.choice || data.answers?.secondaryRequest?.value;
            const rawClientNoul = data.answers?.isClientExplicit?.noul ?? data.answers?.isClientExplicit?.value;
            const secondaryRequest = this.normalizeSecondaryRequest(rawSecondary);

            let isClientExplicit = false;

            if (typeof rawClientNoul === 'number') {
                isClientExplicit = rawClientNoul >= 0.5;
            }

            if (typeof rawClientNoul === 'string') {
                const lower = rawClientNoul.toLowerCase();
                isClientExplicit = lower === 'yes' || lower === 'true';
            }

            if (typeof rawClientNoul === 'boolean') {
                isClientExplicit = rawClientNoul;
            }

            const phoneOrIdPattern = /\b(?:\d{10,13}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
            const identifierMatch = text.match(phoneOrIdPattern);
            const extractedIdentifier = identifierMatch ? identifierMatch[0] : undefined;

            return {
                primaryIntent,
                secondaryRequest,
                isClientExplicit: isClientExplicit || Boolean(extractedIdentifier),
                extractedIdentifier,
                confidence: rawConfidence,
                providerUsed: this.providerId,
                modelUsed: model,
                rawResponse: data,
            };
        } catch (error) {
            this.logger.warn(`Failed connecting to Ollama SystemOne (${(error as Error).message}).`);
            return null;
        }
    }

    public async analyzeWithFallbackModel(
        text: string,
        modelName?: string,
        context?: IntentContext
    ): Promise<IntentAnalysisResult> {
        const targetModel = modelName || this.fallbackModel;

        let systemPrompt = INTENT_SYSTEM_PROMPT;
        if (context?.temporalContext) {
            systemPrompt += `\n\n[TEMPORAL CONTEXT]\n${context.temporalContext}`;
        }

        const messages: Array<{ role: string; content: string }> = [
            {
                role: 'system',
                content: systemPrompt,
            },
        ];

        if (context?.previousBotMessage) {
            messages.push({
                role: 'assistant',
                content: context.previousBotMessage,
            });
        }

        let contextualUserPrompt = text;

        if (context?.hasPendingAction && context?.pendingActionType) {
            contextualUserPrompt = `[Contexto: Confirmação pendente de "${context.pendingActionType}"]. Mensagem do usuário: "${text}"`;
        }

        messages.push({
            role: 'user',
            content: contextualUserPrompt,
        });

        try {
            const chatUrl = `${this.host}/api/chat`;
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: targetModel,
                    messages,
                    format: 'json',
                    stream: false,
                }),
                signal: AbortSignal.timeout(6000),
            });

            if (!response.ok) {
                this.logger.warn(`Ollama fallback model returned ${response.status}. Using rule engine.`);
                return evaluateFallbackIntent(text, this.providerId, context);
            }

            const data = (await response.json()) as { message?: { content?: string } };
            const rawContent = data.message?.content?.trim();

            if (!rawContent) {
                return evaluateFallbackIntent(text, this.providerId, context);
            }

            const parsed = JSON.parse(rawContent) as {
                primaryIntent?: string;
                secondaryRequest?: string;
                actionDetail?: string;
                targetPlan?: string;
                extractedAddress?: string;
                isClientExplicit?: boolean;
                extractedIdentifier?: string;
                suggestedOptions?: string[];
            };

            let primaryIntent = this.normalizePrimaryIntent(parsed.primaryIntent);
            const lowerText = text.toLowerCase().trim();

            // Deterministic safeguards for critical intent overrides
            if (lowerText.includes('simular')) {
                primaryIntent = 'simulate_signature';
            }

            if (
                lowerText.includes('já assinei') ||
                lowerText.includes('ja assinei') ||
                lowerText.includes('acabei de assinar') ||
                lowerText.includes('contrato assinado')
            ) {
                primaryIntent = 'contract_signed';
            }

            if (
                lowerText.includes('qual é o meu plano') ||
                lowerText.includes('qual e o meu plano') ||
                lowerText.includes('qual o meu plano') ||
                lowerText.includes('qual meu plano') ||
                lowerText.includes('meu plano atual')
            ) {
                primaryIntent = 'plan_pricing';
            }

            // If parsed intent is unknown, verify with rule heuristics
            if (primaryIntent === 'unknown') {
                const heuristic = evaluateFallbackIntent(text, this.providerId, context);

                if (heuristic.primaryIntent !== 'unknown') {
                    return heuristic;
                }
            }

            const phoneOrIdPattern = /\b(?:\d{10,13}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
            const idMatch = text.match(phoneOrIdPattern);
            const extractedIdentifier = parsed.extractedIdentifier || (idMatch ? idMatch[0] : undefined);

            return {
                primaryIntent,
                secondaryRequest: this.normalizeSecondaryRequest(parsed.secondaryRequest),
                isClientExplicit: Boolean(parsed.isClientExplicit || extractedIdentifier),
                extractedIdentifier,
                confidence: 0.94,
                providerUsed: this.providerId,
                modelUsed: targetModel,
                actionDetail: parsed.actionDetail || undefined,
                targetPlan: parsed.targetPlan || undefined,
                extractedAddress: parsed.extractedAddress || undefined,
                suggestedOptions: parsed.suggestedOptions || undefined,
                rawResponse: parsed,
            };
        } catch (error) {
            this.logger.warn(`Fallback model analysis failed: ${(error as Error).message}. Using heuristic fallback.`);
            return evaluateFallbackIntent(text, this.providerId, context);
        }
    }

    public async generateText(prompt: string, systemInstruction?: string, modelOverride?: string): Promise<string> {
        if (!prompt) {
            return '';
        }

        let model = modelOverride || this.configService.get<string>('OLLAMA_CHAT_MODEL') || 'qwen2.5:0.5b';

        if (model.includes('tev1')) {
            model = this.configService.get<string>('OLLAMA_FALLBACK_MODEL') || 'qwen2.5:0.5b';
        }

        try {
            const chatUrl = `${this.host}/api/chat`;
            const messages = [];

            if (systemInstruction) {
                messages.push({ role: 'system', content: systemInstruction });
            }

            messages.push({ role: 'user', content: prompt });

            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false,
                }),
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                return '';
            }

            const data = (await response.json()) as { message?: { content?: string } };
            const content = data.message?.content?.trim();

            if (!content) {
                return '';
            }

            return content;
        } catch (error) {
            this.logger.warn(`Ollama generateText failed: ${(error as Error).message}`);
            return '';
        }
    }

    private normalizePrimaryIntent(rawIntent?: string): PrimaryIntent {
        if (!rawIntent) {
            return 'unknown';
        }

        const normalized = rawIntent.toLowerCase().trim();

        const validIntents: PrimaryIntent[] = [
            'greeting',
            'customer_registration',
            'plan_pricing',
            'plan_subscription',
            'contract_signed',
            'simulate_signature',
            'plan_change',
            'cancellation',
            'address_change',
            'technical_support',
            'financial',
            'knowledge_inquiry',
            'confirmation_yes',
            'confirmation_no',
            'human_handoff',
            'unknown',
        ];

        if (validIntents.includes(normalized as PrimaryIntent)) {
            return normalized as PrimaryIntent;
        }

        return 'unknown';
    }

    private normalizeSecondaryRequest(rawSecondary?: string): SecondaryRequest {
        if (!rawSecondary) {
            return 'none';
        }

        const normalized = rawSecondary.toLowerCase().trim();

        if (normalized === 'invoice_request') {
            return 'invoice_request';
        }

        if (normalized === 'plan_upgrade') {
            return 'plan_upgrade';
        }

        return 'none';
    }
}
