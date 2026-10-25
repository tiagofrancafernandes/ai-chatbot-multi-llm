export type FlowNodeType = 'decision' | 'action' | 'message' | 'router';

export interface FlowTransitionCondition {
    type: 'intent_equals' | 'secondary_equals' | 'is_identified' | 'is_not_identified' | 'default';
    value?: string;
}

export interface FlowTransition {
    id: string;
    targetNodeId: string;
    condition: FlowTransitionCondition;
    description?: string;
}

export interface FlowNode {
    id: string;
    name: string;
    type: FlowNodeType;
    description: string;
    actionType?: 'check_customer_id' | 'fetch_invoices' | 'fetch_plans' | 'fetch_business_hours' | 'ai_generate';
    responseTemplate?: string;
    transitions: FlowTransition[];
    metadata?: Record<string, unknown>;
}

export interface FlowDefinition {
    id: string;
    name: string;
    entryNodeId: string;
    nodes: FlowNode[];
    updatedAt: number;
}
