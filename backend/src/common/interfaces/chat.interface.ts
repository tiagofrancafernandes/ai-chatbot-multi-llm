export interface PendingAction {
    type: 'plan_change' | 'cancellation' | 'address_change';
    targetPlan?: string;
    targetAddress?: string;
    previousValue?: string;
    description: string;
    createdAt: number;
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
    pendingAction?: PendingAction | null;
    createdAt: number;
    updatedAt: number;
}
