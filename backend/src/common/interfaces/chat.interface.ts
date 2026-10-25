import { CustomerRegistrationData } from './contract.interface';
import { AttendanceInfo } from './attendance.interface';

export interface PendingAction {
    type: 'plan_change' | 'cancellation' | 'address_change' | 'new_subscription' | 'contract_signing';
    targetPlan?: string;
    targetAddress?: string;
    previousValue?: string;
    description: string;
    contractId?: string;
    contractUrl?: string;
    registrationData?: CustomerRegistrationData;
    createdAt: number;
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
    pendingAction?: PendingAction | null;
    attendance?: AttendanceInfo;
    createdAt: number;
    updatedAt: number;
}
