export type ContractType = 'new_subscription' | 'plan_change';

export type ContractStatus = 'pending_signature' | 'signed' | 'cancelled';

export interface CustomerRegistrationData {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    address?: string;
}

export interface Contract {
    id: string;
    customerId: string;
    type: ContractType;
    planName: string;
    monthlyPrice: number;
    status: ContractStatus;
    signatureUrl: string;
    customerData?: CustomerRegistrationData;
    createdAt: number;
    signedAt?: number;
}
