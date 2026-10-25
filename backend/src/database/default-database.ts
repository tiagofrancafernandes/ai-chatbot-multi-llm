import { DatabaseSchema } from '../common/interfaces/database.interface';

export const INITIAL_DATABASE_DATA: DatabaseSchema = {
    customers: [
        {
            id: '5511999999999',
            name: 'John Doe',
            cpfCnpj: '123.456.789-00',
            phone: '5511999999999',
            plan: 'Premium Business',
            notes: 'VIP Customer with high SLA tier',
            isIdentified: true,
            invoices: [
                {
                    id: 'INV-2026-001',
                    amount: 150.0,
                    dueDate: '2026-11-05',
                    status: 'paid',
                },
                {
                    id: 'INV-2026-002',
                    amount: 150.0,
                    dueDate: '2026-12-05',
                    status: 'pending',
                },
            ],
            metadata: {
                contractStart: '2025-01-01',
                accountManager: 'Alice Smith',
            },
        },
        {
            id: '5511888888888',
            name: 'Maria Silva',
            cpfCnpj: '987.654.321-99',
            phone: '5511888888888',
            plan: 'Starter',
            notes: 'Individual developer account',
            isIdentified: true,
            invoices: [
                {
                    id: 'INV-2026-101',
                    amount: 49.9,
                    dueDate: '2026-10-10',
                    status: 'paid',
                },
            ],
            metadata: {
                contractStart: '2026-03-15',
            },
        },
    ],
    plans: [
        {
            id: 'plan_starter',
            name: 'Starter',
            price: 49.9,
            currency: 'BRL',
            billingCycle: 'monthly',
            features: ['1 Active Seat', 'Community Support', 'Standard API Rate Limit'],
            isPopular: false,
        },
        {
            id: 'plan_pro',
            name: 'Professional',
            price: 99.9,
            currency: 'BRL',
            billingCycle: 'monthly',
            features: ['5 Active Seats', 'Priority Email Support', 'Higher Rate Limits', 'Custom Webhooks'],
            isPopular: true,
        },
        {
            id: 'plan_enterprise',
            name: 'Premium Business',
            price: 150.0,
            currency: 'BRL',
            billingCycle: 'monthly',
            features: ['Unlimited Seats', '24/7 Dedicated Phone Support', 'Dedicated IP', 'Custom Multi-LLM Routers'],
            isPopular: false,
        },
    ],
    businessHours: {
        open: '08:00',
        close: '18:00',
        days: 'Monday to Friday',
        timezone: 'America/Sao_Paulo',
    },
    sessions: [],
    contracts: [],
    flow: {
        id: 'default_flow_v1',
        name: 'Standard Customer Service & Intent Router Flow',
        entryNodeId: 'node_intent_decision',
        updatedAt: Date.now(),
        nodes: [
            {
                id: 'node_intent_decision',
                name: 'AI Intent Analysis Node',
                type: 'decision',
                description: 'Analyzes user prompt with SystemOne or Structured LLM to infer intents',
                transitions: [
                    {
                        id: 'trans_to_auth',
                        targetNodeId: 'node_customer_auth_action',
                        condition: {
                            type: 'is_not_identified',
                        },
                        description: 'Route to auth check if user is not yet identified',
                    },
                    {
                        id: 'trans_to_greeting',
                        targetNodeId: 'node_greeting_message',
                        condition: {
                            type: 'intent_equals',
                            value: 'greeting',
                        },
                        description: 'Route to warm greeting message',
                    },
                    {
                        id: 'trans_to_pricing',
                        targetNodeId: 'node_plan_pricing_action',
                        condition: {
                            type: 'intent_equals',
                            value: 'plan_pricing',
                        },
                        description: 'Route to plan listing action',
                    },
                    {
                        id: 'trans_to_tech_support',
                        targetNodeId: 'node_tech_support_message',
                        condition: {
                            type: 'intent_equals',
                            value: 'technical_support',
                        },
                        description: 'Route to triage diagnostics',
                    },
                    {
                        id: 'trans_to_financial',
                        targetNodeId: 'node_financial_action',
                        condition: {
                            type: 'intent_equals',
                            value: 'financial',
                        },
                        description: 'Route to customer financial statements lookup',
                    },
                    {
                        id: 'trans_to_default',
                        targetNodeId: 'node_fallback_message',
                        condition: {
                            type: 'default',
                        },
                        description: 'Fallback when no specific intent matches',
                    },
                ],
            },
            {
                id: 'node_customer_auth_action',
                name: 'Customer Authentication Action',
                type: 'action',
                description: 'Checks if message contains an identifier token like phone or CPF/CNPJ',
                actionType: 'check_customer_id',
                transitions: [
                    {
                        id: 'trans_auth_default',
                        targetNodeId: 'node_fallback_message',
                        condition: {
                            type: 'default',
                        },
                    },
                ],
            },
            {
                id: 'node_greeting_message',
                name: 'Greeting Message Node',
                type: 'message',
                description: 'Welcomes the identified customer and announces business hours',
                responseTemplate:
                    'Hello {{customerName}}! Great to see you back. Our operating hours today are {{businessOpen}} to {{businessClose}}. How can we assist you today?',
                transitions: [],
            },
            {
                id: 'node_plan_pricing_action',
                name: 'Plan Pricing Lookup Action',
                type: 'action',
                description: 'Extracts active plans and prepares tailored quotation message',
                actionType: 'fetch_plans',
                transitions: [],
            },
            {
                id: 'node_tech_support_message',
                name: 'Technical Support Triage Node',
                type: 'message',
                description: 'Initiates active diagnostic questions for technical incidents',
                responseTemplate:
                    'We are sorry to hear about the system disruption! An automated triage diagnostic ticket has been generated. Could you check if your service link indicator or router light is currently stable or flashing red?',
                transitions: [],
            },
            {
                id: 'node_financial_action',
                name: 'Financial Statements Lookup Action',
                type: 'action',
                description: 'Fetches open/pending invoices and financial metadata for customer',
                actionType: 'fetch_invoices',
                transitions: [],
            },
            {
                id: 'node_fallback_message',
                name: 'Conversational Fallback Node',
                type: 'message',
                description: 'Generic AI assistant response or request for clarification',
                responseTemplate:
                    'Thank you for your message. Could you clarify your request or provide more details so we can assist you properly?',
                transitions: [],
            },
        ],
    },
};
