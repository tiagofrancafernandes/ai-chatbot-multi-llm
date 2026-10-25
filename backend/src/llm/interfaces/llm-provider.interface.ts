export type PrimaryIntent =
    | 'greeting'
    | 'plan_pricing'
    | 'technical_support'
    | 'financial'
    | 'unknown';

export type SecondaryRequest = 'none' | 'invoice_request' | 'plan_upgrade';

export interface IntentAnalysisResult {
    primaryIntent: PrimaryIntent;
    secondaryRequest: SecondaryRequest;
    isClientExplicit: boolean;
    extractedIdentifier?: string;
    confidence?: number;
    providerUsed: string;
    modelUsed: string;
    rawResponse?: unknown;
}

export interface ProviderInfo {
    id: string;
    displayName: string;
    defaultModel: string;
    availableModels: string[];
    isConfigured: boolean;
}

export interface LlmProvider {
    readonly providerId: string;
    readonly displayName: string;
    readonly defaultModel: string;
    readonly availableModels: string[];

    isConfigured(): boolean;
    analyzeIntent(text: string, model?: string): Promise<IntentAnalysisResult>;
    generateText(prompt: string, systemInstruction?: string, model?: string): Promise<string>;
}
