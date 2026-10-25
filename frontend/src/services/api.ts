import {
    InitChatResponse,
    SendMessageResponse,
    ChatSession,
    Customer,
    ProviderInfo,
    KnowledgeBaseData,
} from '../types/chat';

const API_BASE = '/api';

export class ApiService {
    public static async initChat(customerId?: string): Promise<InitChatResponse> {
        const response = await fetch(`${API_BASE}/chat/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to initialize chat session (${response.status})`);
        }

        return response.json();
    }

    public static async sendMessage(
        customerId: string,
        text: string,
        providerId?: string,
        model?: string
    ): Promise<SendMessageResponse> {
        const response = await fetch(`${API_BASE}/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId,
                text,
                providerId,
                model,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to send message (${response.status})`);
        }

        return response.json();
    }

    public static async getHistory(customerId: string): Promise<ChatSession> {
        const response = await fetch(`${API_BASE}/chat/history?customerId=${encodeURIComponent(customerId)}`);

        if (!response.ok) {
            throw new Error(`Failed to load history (${response.status})`);
        }

        return response.json();
    }

    public static async resetSession(customerId: string): Promise<{ success: boolean; newCustomerId: string }> {
        const response = await fetch(`${API_BASE}/chat/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to reset chat session (${response.status})`);
        }

        return response.json();
    }

    public static async getProviders(): Promise<{
        providers: ProviderInfo[];
        activeProvider: string;
        activeModel: string;
    }> {
        const response = await fetch(`${API_BASE}/chat/providers`);

        if (!response.ok) {
            throw new Error(`Failed to fetch providers (${response.status})`);
        }

        return response.json();
    }

    public static async switchProvider(
        providerId: string,
        model?: string
    ): Promise<{ success: boolean; activeProvider: string; activeModel: string }> {
        const response = await fetch(`${API_BASE}/chat/providers/switch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId, model }),
        });

        if (!response.ok) {
            throw new Error(`Failed to switch provider (${response.status})`);
        }

        return response.json();
    }

    public static async getCustomer(id: string): Promise<Customer> {
        const response = await fetch(`${API_BASE}/customers/${encodeURIComponent(id)}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch customer profile (${response.status})`);
        }

        return response.json();
    }

    public static async getFlow(): Promise<unknown> {
        const response = await fetch(`${API_BASE}/flow`);

        if (!response.ok) {
            throw new Error(`Failed to fetch flow definition (${response.status})`);
        }

        return response.json();
    }

    public static async signContract(contractId: string): Promise<{ success: boolean; contract: unknown }> {
        const response = await fetch(`${API_BASE}/chat/contract/sign/${encodeURIComponent(contractId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`Failed to sign contract (${response.status})`);
        }

        return response.json();
    }

    public static async getContract(contractId: string): Promise<{ success: boolean; contract: unknown }> {
        const response = await fetch(`${API_BASE}/chat/contract/${encodeURIComponent(contractId)}`);

        if (!response.ok) {
            throw new Error(`Failed to get contract (${response.status})`);
        }

        return response.json();
    }

    public static async getKnowledge(): Promise<KnowledgeBaseData> {
        const response = await fetch(`${API_BASE}/knowledge`);

        if (!response.ok) {
            throw new Error(`Failed to load knowledge base (${response.status})`);
        }

        return response.json();
    }

    public static async updateKnowledge(
        companyRules: string,
        additionalInstructions?: string
    ): Promise<KnowledgeBaseData> {
        const response = await fetch(`${API_BASE}/knowledge`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyRules, additionalInstructions }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update knowledge base (${response.status})`);
        }

        return response.json();
    }

    public static async rebuildKnowledgeCache(): Promise<KnowledgeBaseData> {
        const response = await fetch(`${API_BASE}/knowledge/rebuild-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`Failed to rebuild knowledge cache (${response.status})`);
        }

        return response.json();
    }

    public static async getAttendanceDeskInfo(): Promise<{
        departments: Array<{
            id: string;
            name: string;
            description: string;
            availableAgentsCount: number;
            estimatedWaitSeconds: number;
        }>;
        agents: Array<{
            id: string;
            name: string;
            department: string;
            departmentName: string;
            isOnline: boolean;
            avatar?: string;
        }>;
    }> {
        const response = await fetch(`${API_BASE}/chat/agents`);

        if (!response.ok) {
            throw new Error(`Failed to load attendance desk info (${response.status})`);
        }

        return response.json();
    }

    public static async transferAttendance(
        customerId: string,
        departmentId?: string,
        agentId?: string,
        timeoutSeconds?: number
    ): Promise<{ session: ChatSession; message: string }> {
        const response = await fetch(`${API_BASE}/chat/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, departmentId, agentId, timeoutSeconds }),
        });

        if (!response.ok) {
            throw new Error(`Failed to transfer attendance (${response.status})`);
        }

        return response.json();
    }

    public static async sendAgentMessage(
        customerId: string,
        text: string,
        agentName?: string,
        agentId?: string
    ): Promise<{ session: ChatSession; message: unknown }> {
        const response = await fetch(`${API_BASE}/chat/agent-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, text, agentName, agentId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to send agent message (${response.status})`);
        }

        return response.json();
    }

    public static async resumeAiAttendance(customerId: string): Promise<{ session: ChatSession; message: string }> {
        const response = await fetch(`${API_BASE}/chat/resume-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to resume AI attendance (${response.status})`);
        }

        return response.json();
    }
}
