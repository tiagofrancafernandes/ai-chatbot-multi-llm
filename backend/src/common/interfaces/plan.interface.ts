export interface Plan {
    id: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: 'monthly' | 'yearly';
    features: string[];
    isPopular: boolean;
    area?: 'urbano' | 'rural';
    speed?: string;
}
