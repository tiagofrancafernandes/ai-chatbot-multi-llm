import { InitChatResponse, SendMessageResponse, ChatSession, Customer, ProviderInfo } from '../types/chat';

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
}
