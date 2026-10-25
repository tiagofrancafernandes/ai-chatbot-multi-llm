import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    LlmProvider,
    IntentAnalysisResult,
    PrimaryIntent,
    SecondaryRequest,
} from '../interfaces/llm-provider.interface';
import { INTENT_SYSTEM_PROMPT, evaluateFallbackIntent } from '../utils/intent-prompt';

@Injectable()
export class GeminiProvider implements LlmProvider {
    private readonly logger = new Logger(GeminiProvider.name);

    public readonly providerId = 'gemini';
    public readonly displayName = 'Google Gemini API';
    public readonly defaultModel: string;
    public readonly availableModels: string[];

    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
        this.defaultModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
        this.availableModels = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    }

    public isConfigured(): boolean {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0 && this.apiKey !== 'your_gemini_api_key_here');
    }

    public async analyzeIntent(text: string, modelOverride?: string): Promise<IntentAnalysisResult> {
        if (!text) {
            return evaluateFallbackIntent('', this.providerId);
        }

        if (!this.isConfigured()) {
            this.logger.debug('Gemini API key is not configured. Falling back to heuristic triage.');
            return evaluateFallbackIntent(text, this.providerId);
        }

        const model = modelOverride || this.defaultModel;

        const requestPayload = {
            systemInstruction: {
                parts: [{ text: INTENT_SYSTEM_PROMPT }],
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `Analyze the following user input and return strict JSON:\n"${text}"` }],
                },
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
            },
        };

        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload),
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                this.logger.warn(`Gemini API returned status ${response.status}. Using heuristic fallback.`);
                return evaluateFallbackIntent(text, this.providerId);
            }

            const data = (await response.json()) as {
                candidates?: Array<{
                    content?: {
                        parts?: Array<{ text?: string }>;
                    };
                }>;
            };

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
                return evaluateFallbackIntent(text, this.providerId);
            }

            const parsed = JSON.parse(rawText) as {
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
            this.logger.warn(`Gemini analysis error: ${(error as Error).message}. Falling back.`);
            return evaluateFallbackIntent(text, this.providerId);
        }
    }

    public async generateText(prompt: string, systemInstruction?: string, modelOverride?: string): Promise<string> {
        if (!prompt) {
            return '';
        }

        if (!this.isConfigured()) {
            return 'Gemini API key is not configured. Please supply GEMINI_API_KEY in .env.';
        }

        const model = modelOverride || this.defaultModel;

        const requestPayload: {
            contents: Array<{ role: string; parts: Array<{ text: string }> }>;
            systemInstruction?: { parts: Array<{ text: string }> };
            generationConfig: { temperature: number };
        } = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 },
        };

        if (systemInstruction) {
            requestPayload.systemInstruction = {
                parts: [{ text: systemInstruction }],
            };
        }

        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload),
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                return `Gemini API returned status ${response.status}.`;
            }

            const data = (await response.json()) as {
                candidates?: Array<{
                    content?: {
                        parts?: Array<{ text?: string }>;
                    };
                }>;
            };

            const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (!content) {
                return 'No text generated from Gemini.';
            }

            return content;
        } catch (error) {
            this.logger.warn(`Gemini generateText error: ${(error as Error).message}`);
            return 'Unable to generate response from Gemini at this moment.';
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
