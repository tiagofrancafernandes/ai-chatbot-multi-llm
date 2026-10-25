export interface Invoice {
    id: string;
    amount: number;
    dueDate: string;
    status: 'paid' | 'pending';
}

export interface Customer {
    id: string;
    name?: string;
    cpfCnpj?: string;
    phone?: string;
    plan?: string;
    notes?: string;
    invoices: Invoice[];
    isIdentified: boolean;
    metadata?: Record<string, unknown>;
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'bot' | 'system';
    text: string;
    timestamp: number;
    nodeId?: string;
    detectedIntent?: string;
    secondaryRequest?: string;
    provider?: string;
    model?: string;
    options?: string[];
    metadata?: Record<string, unknown>;
}

export interface ChatSession {
    id: string;
    customerId: string;
    messages: ChatMessage[];
    activeNodeId: string;
    currentIntent?: string;
    secondaryRequest?: string;
    pendingAction?: {
        type: string;
        targetPlan?: string;
        targetAddress?: string;
        description: string;
    } | null;
    createdAt: number;
    updatedAt: number;
}

export interface ProviderInfo {
    id: string;
    displayName: string;
    defaultModel: string;
    availableModels: string[];
    isConfigured: boolean;
}

export interface InitChatResponse {
    session: ChatSession;
    customer: Customer;
    activeProvider: string;
    activeModel: string;
}

export interface SendMessageResponse {
    session: ChatSession;
    customer: Customer;
    botResponse: string;
    analysis?: {
        primaryIntent: string;
        secondaryRequest: string;
        isClientExplicit: boolean;
        providerUsed: string;
        modelUsed: string;
    };
}
