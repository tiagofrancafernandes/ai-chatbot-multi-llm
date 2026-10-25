import { DatabaseSchema } from '../common/interfaces/database.interface';

export const INITIAL_DATABASE_DATA: DatabaseSchema = {
    customers: [
        {
            id: '5537999999999',
            name: 'João Santos',
            cpfCnpj: '123.456.789-00',
            phone: '5537999999999',
            plan: 'Urbano 600 Mega',
            notes: 'Cliente residencial urbano em Carmo do Cajuru',
            isIdentified: true,
            invoices: [
                {
                    id: 'INV-2026-001',
                    amount: 79.99,
                    dueDate: '2026-11-10',
                    status: 'pending',
                },
            ],
            metadata: {
                contractStart: '2025-01-01',
                cidade: 'Carmo do Cajuru',
            },
        },
        {
            id: '5537988888888',
            name: 'Maria Silva',
            cpfCnpj: '987.654.321-99',
            phone: '5537988888888',
            plan: 'Rural 600 Mega',
            notes: 'Cliente em São José dos Salgados',
            isIdentified: true,
            invoices: [
                {
                    id: 'INV-2026-101',
                    amount: 99.99,
                    dueDate: '2026-10-10',
                    status: 'paid',
                },
            ],
            metadata: {
                contractStart: '2026-03-15',
                distrito: 'São José dos Salgados',
            },
        },
    ],
    plans: [
        {
            id: 'plan_urbano_600',
            name: 'Urbano 600 Mega',
            price: 79.99,
            currency: 'BRL',
            billingCycle: 'monthly',
            area: 'urbano',
            speed: '600MB',
            features: [
                '100% Fibra Óptica',
                'Download 600 Mbps / Upload simétrico',
                'Wi-Fi 6 incluso',
                'Instalação grátis',
            ],
            isPopular: false,
        },
        {
            id: 'plan_urbano_800',
            name: 'Urbano 800 Mega',
            price: 89.99,
            currency: 'BRL',
            billingCycle: 'monthly',
            area: 'urbano',
            speed: '800MB',
            features: [
                '100% Fibra Óptica',
                'Download 800 Mbps / Upload simétrico',
                'Wi-Fi 6 incluso',
                'Instalação grátis',
            ],
            isPopular: true,
        },
        {
            id: 'plan_urbano_1gb',
            name: 'Urbano 1 Giga',
            price: 99.99,
            currency: 'BRL',
            billingCycle: 'monthly',
            area: 'urbano',
            speed: '1GB',
            features: [
                '100% Fibra Óptica Ultra Velocidade',
                'Download 1000 Mbps (1 Gbps)',
                'Wi-Fi 6 de alta performance',
                'Instalação grátis',
            ],
            isPopular: false,
        },
        {
            id: 'plan_rural_600',
            name: 'Rural 600 Mega',
            price: 99.99,
            currency: 'BRL',
            billingCycle: 'monthly',
            area: 'rural',
            speed: '600MB',
            features: [
                '100% Fibra Óptica Rural',
                'Download 600 Mbps',
                'Wi-Fi incluso',
                'Taxa de instalação sob consulta',
            ],
            isPopular: false,
        },
        {
            id: 'plan_rural_800',
            name: 'Rural 800 Mega',
            price: 110.99,
            currency: 'BRL',
            billingCycle: 'monthly',
            area: 'rural',
            speed: '800MB',
            features: [
                '100% Fibra Óptica Rural',
                'Download 800 Mbps',
                'Wi-Fi incluso',
                'Taxa de instalação sob consulta',
            ],
            isPopular: true,
        },
        {
            id: 'plan_rural_1gb',
            name: 'Rural 1 Giga',
            price: 120.99,
            currency: 'BRL',
            billingCycle: 'monthly',
            area: 'rural',
            speed: '1GB',
            features: [
                '100% Fibra Óptica Rural Ultra',
                'Download 1000 Mbps (1 Gbps)',
                'Wi-Fi Gigabit de alta performance',
                'Taxa de instalação sob consulta',
            ],
            isPopular: false,
        },
    ],
    businessHours: {
        open: '08:00',
        close: '18:00',
        days: 'Segunda a Sexta: 08h às 18h | Sábado: 08h às 12h',
        timezone: 'America/Sao_Paulo',
    },
    sessions: [],
    contracts: [],
    knowledgeBase: {
        companyRules:
            'Provedor de Internet 100% Fibra Óptica, especializado em internet residencial e soluções de conectividade para empresas.\n' +
            'Endereço: R. Tiradentes, 405 - Carmo do Cajuru, MG, CEP 35510-000.\n' +
            'Telefone: (37) 3333-4444 | E-mail: comercial@minhainternet.com.\n' +
            'Horário de Atendimento presencial e telefônico: Segunda a Sexta: 08h às 18h | Sábado: 08h às 12h.\n\n' +
            'Áreas Atendidas / Cobertura:\n' +
            '• Carmo do Cajuru - MG: 100% da área urbana atendida e parcialmente a zona rural nas proximidades da cidade.\n' +
            '• São José dos Salgados - MG (distrito de Carmo do Cajuru): 100% da área urbana atendida e parcialmente a zona rural nas proximidades.\n\n' +
            'Planos de Internet Fibra Óptica para Área Urbana:\n' +
            '• 600 Mega: R$ 79,99/mês (Instalação grátis, Wi-Fi incluso)\n' +
            '• 800 Mega: R$ 89,99/mês (Instalação grátis, Wi-Fi incluso)\n' +
            '• 1 Giga: R$ 99,99/mês (Instalação grátis, Wi-Fi 6 de alta velocidade)\n\n' +
            'Planos de Internet Fibra Óptica para Área Rural:\n' +
            '• 600 Mega: R$ 99,99/mês\n' +
            '• 800 Mega: R$ 110,99/mês\n' +
            '• 1 Giga: R$ 120,99/mês\n' +
            '(Na área rural, pode haver cobrança de taxa de instalação dependendo do ponto de instalação em relação à rede cabeada).\n\n' +
            'Serviços Corporativos e Equipamentos Adicionais:\n' +
            '• Venda de roteadores adicionais e implantação de Rede Mesh (cobertura total em residências e empresas);\n' +
            '• Wi-Fi Corporativo gerenciado;\n' +
            '• Links Dedicados para empresas com garantia de banda e SLA;\n' +
            'Obs: Preços e condições de roteadores, Wi-Fi corporativo e links dedicados são a combinar sob consulta, dependendo da análise de necessidade para precificação.\n\n' +
            'Formas de pagamento aceitas: Boletos bancários, PIX com compensação imediata e cartão de crédito.',
        additionalInstructions:
            'Avisos e Políticas de Atendimento:\n' +
            '• Toda a internet é 100% entregue via Fibra Óptica de ponta a ponta.\n' +
            '• Para clientes da zona rural, orientar o envio da localização ou ponto de referência para que nossa equipe técnica verifique a distância da rede e o valor da taxa de instalação.\n' +
            '• Para rede mesh, links dedicados e Wi-Fi corporativo, coletar telefone de contato para um especialista comercial entrar em contato.',
        cachedSummary:
            'Provedor 100% Fibra Óptica em Carmo do Cajuru e São José dos Salgados - MG. Endereço: R. Tiradentes, 405, Carmo do Cajuru - MG. Tel: (37) 3333-4444, comercial@minhainternet.com. Atendimento: Seg-Sex 08h-18h, Sáb 08h-12h. Cobertura: 100% urbana e proximidades rurais em Carmo do Cajuru e São José dos Salgados. Planos Urbanos: 600MB (R$ 79,99), 800MB (R$ 89,99), 1GB (R$ 99,99) com instalação grátis. Planos Rurais: 600MB (R$ 99,99), 800MB (R$ 110,99), 1GB (R$ 120,99), com taxa de instalação sob consulta do ponto. Rede Mesh, Wi-Fi corporativo e Links Dedicados são à combinar sob análise de necessidade.',
        lastCompiledAt: Date.now(),
    },
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
                        id: 'trans_to_registration',
                        targetNodeId: 'node_customer_registration_action',
                        condition: {
                            type: 'intent_equals',
                            value: 'customer_registration',
                        },
                        description: 'Route new prospective customers to registration and onboarding',
                    },
                    {
                        id: 'trans_to_subscription',
                        targetNodeId: 'node_customer_registration_action',
                        condition: {
                            type: 'intent_equals',
                            value: 'plan_subscription',
                        },
                        description: 'Route plan subscription requests to registration and contract flow',
                    },
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
                id: 'node_customer_registration_action',
                name: 'Customer Registration Action',
                type: 'action',
                description:
                    'Collects customer registration details (name, CPF, email, phone, address) and creates digital subscription contract',
                actionType: 'register_customer',
                transitions: [
                    {
                        id: 'trans_reg_to_pricing',
                        targetNodeId: 'node_plan_pricing_action',
                        condition: {
                            type: 'intent_equals',
                            value: 'plan_pricing',
                        },
                        description: 'Allow customer to view pricing while registering',
                    },
                    {
                        id: 'trans_reg_default',
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
    departments: [
        {
            id: 'dept_suporte',
            name: 'Suporte Técnico Especializado',
            description: 'Diagnósticos de conexão, sinal óptico, modems e lentidão',
            availableAgentsCount: 2,
            estimatedWaitSeconds: 30,
        },
        {
            id: 'dept_comercial',
            name: 'Comercial & Vendas (Fibra Óptica)',
            description: 'Contratação, upgrade de planos, rede mesh e links dedicados',
            availableAgentsCount: 2,
            estimatedWaitSeconds: 15,
        },
        {
            id: 'dept_financeiro',
            name: 'Financeiro & Cobrança (SAC)',
            description: '2ª via de boletos, quitação, negociação e comprovantes',
            availableAgentsCount: 1,
            estimatedWaitSeconds: 45,
        },
    ],
    agents: [
        {
            id: 'agent_mariana',
            name: 'Mariana Silva',
            department: 'dept_suporte',
            departmentName: 'Suporte Técnico',
            isOnline: true,
            avatar: 'tabler:headset',
        },
        {
            id: 'agent_carlos',
            name: 'Carlos Mendes',
            department: 'dept_comercial',
            departmentName: 'Comercial & Vendas',
            isOnline: true,
            avatar: 'tabler:user-check',
        },
        {
            id: 'agent_juliana',
            name: 'Juliana Santos',
            department: 'dept_financeiro',
            departmentName: 'Financeiro / SAC',
            isOnline: false,
            avatar: 'tabler:receipt',
        },
    ],
};
