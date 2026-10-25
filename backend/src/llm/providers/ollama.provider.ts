import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    LlmProvider,
    IntentAnalysisResult,
    PrimaryIntent,
    SecondaryRequest,
} from '../interfaces/llm-provider.interface';
import { evaluateFallbackIntent } from '../utils/intent-prompt';

@Injectable()
export class OllamaProvider implements LlmProvider {
    private readonly logger = new Logger(OllamaProvider.name);

    public readonly providerId = 'ollama';
    public readonly displayName = 'Ollama (Local / SystemOne)';
    public readonly defaultModel: string;
    public readonly availableModels: string[];

    private readonly host: string;

    constructor(private readonly configService: ConfigService) {
        this.host = this.configService.get<string>('OLLAMA_HOST') || 'http://localhost:11434';
        this.defaultModel = this.configService.get<string>('OLLAMA_DECISION_MODEL') || 'tev1:0.8b';
        this.availableModels = ['tev1:0.8b', 'nimble', 'llama3.2:1b', 'llama3.2:3b', 'qwen2.5:0.5b'];
    }

    public isConfigured(): boolean {
        return Boolean(this.host);
    }

    public async analyzeIntent(text: string, modelOverride?: string): Promise<IntentAnalysisResult> {
        if (!text) {
            return evaluateFallbackIntent('', this.providerId);
        }

        const model = modelOverride || this.defaultModel;

        const systemOnePayload = {
            model,
            state: text,
            questions: {
                primaryIntent: {
                    type: 'choice',
                    instructions: 'What is the primary intent of the user?',
                    criteria: {
                        greeting: 'Greetings or salutations like hi, hello, bom dia',
                        plan_pricing: 'Inquiries about plan prices, tiers, costs or features',
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
                this.logger.warn(
                    `Ollama /v1/systemone returned status ${response.status}. Attempting standard fallback.`
                );
                return evaluateFallbackIntent(text, this.providerId);
            }

            const data = (await response.json()) as {
                answers?: {
                    primaryIntent?: { value?: string };
                    secondaryRequest?: { value?: string };
                    isClientExplicit?: { value?: string };
                };
            };

            const rawPrimary = data.answers?.primaryIntent?.value;
            const rawSecondary = data.answers?.secondaryRequest?.value;
            const rawClientExplicit = data.answers?.isClientExplicit?.value;

            const primaryIntent = this.normalizePrimaryIntent(rawPrimary);
            const secondaryRequest = this.normalizeSecondaryRequest(rawSecondary);
            const isClientExplicit = rawClientExplicit === 'yes' || rawClientExplicit === 'true';

            const phoneOrIdPattern = /\b(?:\d{10,13}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
            const identifierMatch = text.match(phoneOrIdPattern);
            const extractedIdentifier = identifierMatch ? identifierMatch[0] : undefined;

            return {
                primaryIntent,
                secondaryRequest,
                isClientExplicit: isClientExplicit || Boolean(extractedIdentifier),
                extractedIdentifier,
                confidence: 0.95,
                providerUsed: this.providerId,
                modelUsed: model,
                rawResponse: data,
            };
        } catch (error) {
            this.logger.warn(`Failed to connect to Ollama at ${this.host}: ${(error as Error).message}. Using heuristic triage.`);
            return evaluateFallbackIntent(text, this.providerId);
        }
    }

    public async generateText(prompt: string, systemInstruction?: string, modelOverride?: string): Promise<string> {
        if (!prompt) {
            return '';
        }

        const model = modelOverride || this.configService.get<string>('OLLAMA_CHAT_MODEL') || 'llama3.2:1b';

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
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                return `Service notice: Ollama model ${model} temporarily unavailable (Status: ${response.status}).`;
            }

            const data = (await response.json()) as { message?: { content?: string } };

            const content = data.message?.content?.trim();

            if (!content) {
                return 'No text generated from Ollama.';
            }

            return content;
        } catch (error) {
            this.logger.warn(`Ollama generateText failed: ${(error as Error).message}`);
            return 'Thank you for reaching out. We have received your message.';
        }
    }

    private normalizePrimaryIntent(rawIntent?: string): PrimaryIntent {
        if (!rawIntent) {
            return 'unknown';
        }

        const normalized = rawIntent.toLowerCase().trim();

        if (normalized === 'greeting') {
            return 'greeting';
        }

        if (normalized === 'plan_pricing') {
            return 'plan_pricing';
        }

        if (normalized === 'technical_support') {
            return 'technical_support';
        }

        if (normalized === 'financial') {
            return 'financial';
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
