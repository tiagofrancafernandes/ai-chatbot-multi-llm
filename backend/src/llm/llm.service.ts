import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider, IntentAnalysisResult, ProviderInfo } from './interfaces/llm-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { LmStudioProvider } from './providers/lmstudio.provider';

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);
    private readonly providers = new Map<string, LlmProvider>();
    private activeProviderId: string;
    private activeModelOverride?: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly ollamaProvider: OllamaProvider,
        private readonly geminiProvider: GeminiProvider,
        private readonly openAiProvider: OpenAiProvider,
        private readonly lmStudioProvider: LmStudioProvider
    ) {
        this.registerProvider(this.ollamaProvider);
        this.registerProvider(this.geminiProvider);
        this.registerProvider(this.openAiProvider);
        this.registerProvider(this.lmStudioProvider);

        const configuredDefault =
            this.configService.get<string>('DEFAULT_PROVIDER') ||
            this.configService.get<string>('ACTIVE_PROVIDER') ||
            'ollama';

        this.activeProviderId = this.providers.has(configuredDefault) ? configuredDefault : 'ollama';

        const configuredModel =
            this.configService.get<string>('DEFAULT_MODEL') || this.configService.get<string>('ACTIVE_MODEL');

        if (configuredModel) {
            this.activeModelOverride = configuredModel;
        }

        this.logger.log(
            `Default active LLM provider set to: ${this.activeProviderId} (Model: ${this.activeModelOverride || 'default'})`
        );
    }

    public registerProvider(provider: LlmProvider): void {
        this.providers.set(provider.providerId, provider);
    }

    public getProvider(providerId?: string): LlmProvider {
        const targetId = providerId || this.activeProviderId;
        const provider = this.providers.get(targetId);

        if (provider) {
            return provider;
        }

        const fallback = this.providers.get('ollama');

        if (fallback) {
            return fallback;
        }

        throw new Error(`No LLM provider available for id: ${targetId}`);
    }

    public getActiveProviderId(): string {
        return this.activeProviderId;
    }

    public getActiveModel(): string {
        if (this.activeModelOverride) {
            return this.activeModelOverride;
        }

        const provider = this.getProvider();

        return provider.defaultModel;
    }

    public setActiveProvider(providerId: string, model?: string): void {
        if (!this.providers.has(providerId)) {
            throw new Error(`Provider "${providerId}" is not recognized`);
        }

        this.activeProviderId = providerId;

        if (model) {
            this.activeModelOverride = model;
        }

        if (!model) {
            this.activeModelOverride = undefined;
        }

        this.logger.log(`Active LLM provider switched to: ${this.activeProviderId}`);
    }

    public listProviders(): ProviderInfo[] {
        const list: ProviderInfo[] = [];

        this.providers.forEach((provider) => {
            list.push({
                id: provider.providerId,
                displayName: provider.displayName,
                defaultModel: provider.defaultModel,
                availableModels: provider.availableModels,
                isConfigured: provider.isConfigured(),
            });
        });

        return list;
    }

    public async analyzeIntent(
        text: string,
        providerId?: string,
        modelOverride?: string
    ): Promise<IntentAnalysisResult> {
        const provider = this.getProvider(providerId);
        const model = modelOverride || this.activeModelOverride || provider.defaultModel;

        const analysis = await provider.analyzeIntent(text, model);

        return analysis;
    }

    public async generateText(
        prompt: string,
        systemInstruction?: string,
        providerId?: string,
        modelOverride?: string
    ): Promise<string> {
        const provider = this.getProvider(providerId);
        const model = modelOverride || this.activeModelOverride || provider.defaultModel;

        const generated = await provider.generateText(prompt, systemInstruction, model);

        return generated;
    }
}
