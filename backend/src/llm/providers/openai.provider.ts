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
export class OpenAiProvider implements LlmProvider {
    private readonly logger = new Logger(OpenAiProvider.name);

    public readonly providerId = 'openai';
    public readonly displayName = 'OpenAI API';
    public readonly defaultModel: string;
    public readonly availableModels: string[];

    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
        this.defaultModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
        this.availableModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    }

    public isConfigured(): boolean {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0 && this.apiKey !== 'your_openai_api_key_here');
    }

    public async analyzeIntent(
        text: string,
        modelOverride?: string,
        context?: IntentContext
    ): Promise<IntentAnalysisResult> {
        if (!text) {
            return evaluateFallbackIntent('', this.providerId, context);
        }

        if (!this.isConfigured()) {
            return evaluateFallbackIntent(text, this.providerId, context);
        }

        const model = modelOverride || this.defaultModel;

        try {
            const endpoint = 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: INTENT_SYSTEM_PROMPT },
                        { role: 'user', content: text },
                    ],
                }),
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                this.logger.warn(`OpenAI returned status ${response.status}. Using fallback.`);
                return evaluateFallbackIntent(text, this.providerId);
            }

            const data = (await response.json()) as {
                choices?: Array<{
                    message?: { content?: string };
                }>;
            };

            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                return evaluateFallbackIntent(text, this.providerId);
            }

            const parsed = JSON.parse(content) as {
                primaryIntent?: string;
                secondaryRequest?: string;
                isClientExplicit?: boolean;
                extractedIdentifier?: string;
            };

            return {
                primaryIntent: this.normalizePrimaryIntent(parsed.primaryIntent),
                secondaryRequest: this.normalizeSecondaryRequest(parsed.secondaryRequest),
                isClientExplicit: Boolean(parsed.isClientExplicit),
                extractedIdentifier: parsed.extractedIdentifier || undefined,
                confidence: 0.98,
                providerUsed: this.providerId,
                modelUsed: model,
                rawResponse: parsed,
            };
        } catch (error) {
            this.logger.warn(`OpenAI error: ${(error as Error).message}. Falling back.`);
            return evaluateFallbackIntent(text, this.providerId);
        }
    }

    public async generateText(prompt: string, systemInstruction?: string, modelOverride?: string): Promise<string> {
        if (!prompt) {
            return '';
        }

        if (!this.isConfigured()) {
            return 'OpenAI API key is not configured.';
        }

        const model = modelOverride || this.defaultModel;

        const messages = [];

        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        messages.push({ role: 'user', content: prompt });

        try {
            const endpoint = 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                }),
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                return `OpenAI API returned status ${response.status}.`;
            }

            const data = (await response.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
            };

            const content = data.choices?.[0]?.message?.content?.trim();

            if (!content) {
                return 'No content generated from OpenAI.';
            }

            return content;
        } catch (error) {
            this.logger.warn(`OpenAI generateText error: ${(error as Error).message}`);
            return 'Unable to generate response from OpenAI at this moment.';
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
