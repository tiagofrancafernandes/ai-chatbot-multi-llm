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
    metadata?: Record<string, unknown>;
}

export interface ChatSession {
    id: string;
    customerId: string;
    messages: ChatMessage[];
    activeNodeId: string;
    currentIntent?: string;
    secondaryRequest?: string;
    createdAt: number;
    updatedAt: number;
}
