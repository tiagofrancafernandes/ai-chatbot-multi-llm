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
    invoices: Invoice[];
    isIdentified: boolean;
    metadata?: Record<string, unknown>;
}
