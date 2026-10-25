export type PrimaryIntent =
    | 'greeting'
    | 'customer_registration'
    | 'plan_pricing'
    | 'plan_subscription'
    | 'contract_signed'
    | 'simulate_signature'
    | 'plan_change'
    | 'cancellation'
    | 'address_change'
    | 'technical_support'
    | 'financial'
    | 'knowledge_inquiry'
    | 'confirmation_yes'
    | 'confirmation_no'
    | 'human_handoff'
    | 'unknown';

export type SecondaryRequest = 'none' | 'invoice_request' | 'plan_upgrade';

export interface IntentContext {
    previousBotMessage?: string;
    hasPendingAction?: boolean;
    pendingActionType?: string;
    customerPlan?: string;
    knowledgeContext?: string;
}

export interface IntentAnalysisResult {
    primaryIntent: PrimaryIntent;
    secondaryRequest: SecondaryRequest;
    isClientExplicit: boolean;
    extractedIdentifier?: string;
    confidence?: number;
    providerUsed: string;
    modelUsed: string;
    actionDetail?: string;
    targetPlan?: string;
    extractedAddress?: string;
    suggestedOptions?: string[];
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
    analyzeIntent(text: string, model?: string, context?: IntentContext): Promise<IntentAnalysisResult>;
    generateText(prompt: string, systemInstruction?: string, model?: string): Promise<string>;
}
