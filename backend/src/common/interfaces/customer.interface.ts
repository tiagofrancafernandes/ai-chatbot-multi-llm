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
