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
    email?: string;
    plan?: string;
    notes?: string;
    connectionStatus?: 'active' | 'suspended' | 'blocked';
    opticalSignal?: {
        rxPowerDbm: number;
        txPowerDbm: number;
        ponStatus: 'operational' | 'degraded' | 'offline';
        lastOnlineAt: string;
        onuMac?: string;
    };
    invoices: Invoice[];
    isIdentified: boolean;
    metadata?: Record<string, unknown>;
}

export type AttendanceMode = 'ai' | 'human_queued' | 'human_active';

export interface AttendanceAssignedTo {
    type: 'ai' | 'queue' | 'agent';
    id?: string;
    name: string;
    department?: string;
    avatar?: string;
}

export interface AttendanceQueueInfo {
    department: string;
    departmentName: string;
    position: number;
    estimatedWaitSeconds: number;
    enteredAt: number;
}

export interface AttendanceInfo {
    mode: AttendanceMode;
    assignedTo: AttendanceAssignedTo;
    queue?: AttendanceQueueInfo;
    pausedAt?: number;
    timeoutSeconds: number;
    lastAgentInteractionAt?: number;
    lastCustomerInteractionAt?: number;
}

export interface HumanAgent {
    id: string;
    name: string;
    department: string;
    departmentName: string;
    isOnline: boolean;
    avatar?: string;
}

export interface AttendanceDepartment {
    id: string;
    name: string;
    description: string;
    availableAgentsCount: number;
    estimatedWaitSeconds: number;
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'bot' | 'system' | 'agent';
    agentName?: string;
    text: string;
    timestamp: number;
    nodeId?: string;
    detectedIntent?: string;
    secondaryRequest?: string;
    provider?: string;
    model?: string;
    options?: string[];
    isInternal?: boolean;
    internalCategory?: 'operator_note' | 'action_confirmation' | 'telemetry_status' | 'financial_summary';
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
        contractId?: string;
        contractUrl?: string;
        description: string;
    } | null;
    attendance?: AttendanceInfo;
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

export interface KnowledgeBaseData {
    companyRules: string;
    additionalInstructions: string;
    cachedSummary: string;
    lastCompiledAt: number;
}

export interface ChatSessionSummary {
    session: ChatSession;
    customer: Customer;
    lastMessage?: ChatMessage;
    messageCount: number;
}
