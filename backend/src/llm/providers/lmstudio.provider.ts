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
export class LmStudioProvider implements LlmProvider {
    private readonly logger = new Logger(LmStudioProvider.name);

    public readonly providerId = 'lmstudio';
    public readonly displayName = 'LM Studio (Local)';
    public readonly defaultModel: string;
    public readonly availableModels: string[];

    private readonly host: string;

    constructor(private readonly configService: ConfigService) {
        this.host = this.configService.get<string>('LMSTUDIO_HOST') || 'http://localhost:1234/v1';
        this.defaultModel = this.configService.get<string>('LMSTUDIO_MODEL') || 'local-model';
        this.availableModels = ['local-model', 'mistral', 'llama-3.2-3b'];
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

        const model = modelOverride || this.defaultModel;

        try {
            const endpoint = `${this.host}/chat/completions`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                confidence: 0.9,
                providerUsed: this.providerId,
                modelUsed: model,
                rawResponse: parsed,
            };
        } catch (error) {
            this.logger.warn(`LM Studio connection failed at ${this.host}: ${(error as Error).message}. Falling back.`);
            return evaluateFallbackIntent(text, this.providerId);
        }
    }

    public async generateText(prompt: string, systemInstruction?: string, modelOverride?: string): Promise<string> {
        if (!prompt) {
            return '';
        }

        const model = modelOverride || this.defaultModel;

        const messages = [];

        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        messages.push({ role: 'user', content: prompt });

        try {
            const endpoint = `${this.host}/chat/completions`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                }),
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                return `LM Studio returned status ${response.status}.`;
            }

            const data = (await response.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
            };

            const content = data.choices?.[0]?.message?.content?.trim();

            if (!content) {
                return 'No content generated from LM Studio.';
            }

            return content;
        } catch (error) {
            this.logger.warn(`LM Studio generateText error: ${(error as Error).message}`);
            return 'Unable to generate response from LM Studio.';
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
