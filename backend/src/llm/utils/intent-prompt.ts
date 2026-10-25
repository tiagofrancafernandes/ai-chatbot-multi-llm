import {
    IntentAnalysisResult,
    IntentContext,
    PrimaryIntent,
    SecondaryRequest,
} from '../interfaces/llm-provider.interface';

export const INTENT_SYSTEM_PROMPT = `
You are an expert AI triage and customer intent classifier for a Brazilian telecommunications & ISP provider.
Analyze the user text (including Brazilian slang, typos, abbreviations, and informal messages) and output ONLY a valid JSON object.

Schema:
{
    "primaryIntent": "greeting" | "customer_registration" | "plan_pricing" | "plan_subscription" | "contract_signed" | "simulate_signature" | "plan_change" | "cancellation" | "address_change" | "technical_support" | "financial" | "knowledge_inquiry" | "confirmation_yes" | "confirmation_no" | "human_handoff" | "unknown",
    "secondaryRequest": "none" | "invoice_request" | "plan_upgrade",
    "actionDetail": string | null,
    "targetPlan": "cheapest" | "Urbano 600 Mega" | "Urbano 800 Mega" | "Urbano 1 Giga" | "Rural 600 Mega" | "Rural 800 Mega" | "Rural 1 Giga" | null,
    "extractedAddress": string | null (extract address ONLY if present in the user text itself, otherwise null),
    "isClientExplicit": boolean,
    "extractedIdentifier": string | null,
    "suggestedOptions": string[]
}

Intent Definitions:
- "greeting": "oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello".
- "customer_registration": User (visitor/prospect) wants to register, sign up, create an account, or open customer profile (e.g. "quero me registrar", "criar conta", "fazer cadastro", "novo cliente", "cadastrar").
- "plan_pricing": Inquiries about available 100% optical fiber internet plans, pricing, values, selecting urban vs rural area for plans ("área urbana", "área rural", "dentro da cidade", "sítio / arredores", "planos rurais", "planos urbanos"), or asking "qual meu plano atual?".
- "plan_subscription": User (visitor/prospect) wants to hire/subscribe to a plan (e.g. "quero assinar o plano de 600 mega", "contratar fibra urbana de 800", "assinar de 79.99", "plano rural").
- "contract_signed": User informs they signed the digital contract ("já assinei", "assinei o contrato", "contrato assinado"). NEVER classify as confirmation_no!
- "simulate_signature": User wants to simulate digital signature ("simular assinatura", "simular contrato"). NEVER classify "simular assinatura" as confirmation_no or cancellation!
- "plan_change": User wants to change, switch, upgrade, or downgrade plan (e.g., "mudar para o plano de 800 Mega", "trocar pro plano de 1 Giga", "mudar pro mais barato"). If user mentions a specific plan, targetPlan MUST be that plan, NOT "cheapest".
- "cancellation": User wants to cancel subscription or contract (e.g., "quero cancelar", "cancela meu plano", "encerrar assinatura").
- "address_change": User requests address update (e.g., "mudei de casa", "trocar meu endereço pra Rua X 123", "novo endereço").
- "technical_support": Connection outages, slow speed, blinking red router lights, system errors, "caiu a net", "modem piscando".
- "financial": Invoices, boletos, 2nd copy, billing, debts, payment inquiries.
- "knowledge_inquiry": Questions regarding company physical address in Carmo do Cajuru - MG (R. Tiradentes, 405), phone ((37) 3333-4444), email (comercial@minhainternet.com), operating hours (Seg-Sex 08h-18h, Sáb 08h-12h), 100% optical fiber connection, mesh network / extra routers, corporate Wi-Fi, dedicated links for companies, or coverage areas (Carmo do Cajuru - MG and São José dos Salgados - MG, 100% urban and rural proximities).
- "confirmation_yes": Affirmation when a confirmation is pending ("sim", "confirmo", "pode ser", "positivo", "claro", "isso", "pode mudar").
- "confirmation_no": Denial or aborting pending action ("não", "cancela isso", "esquece", "não quero mais", "deixa quieto").
- "human_handoff": User specifically requests a human agent ("falar com atendente", "humano", "atendente").
- "unknown": Unclear, gibberish, or queries outside typical telecom operations.
`;

export function evaluateFallbackIntent(
    rawText: string,
    providerName = 'heuristic',
    context?: IntentContext
): IntentAnalysisResult {
    const text = (rawText || '').toLowerCase().trim();

    let primaryIntent: PrimaryIntent = 'unknown';
    let secondaryRequest: SecondaryRequest = 'none';
    let targetPlan: string | undefined;
    let extractedAddress: string | undefined;
    let actionDetail: string | undefined;

    // 1. Contract Simulation & Signature Checks (Absolute Priority)
    if (text.includes('simular assinatura') || text.includes('simular contrato') || text.includes('simular')) {
        return {
            primaryIntent: 'simulate_signature',
            secondaryRequest: 'none',
            isClientExplicit: true,
            confidence: 0.99,
            providerUsed: providerName,
            modelUsed: 'heuristic-rule-engine',
            actionDetail: 'simulate_signature',
        };
    }

    const isContractSigned =
        text.includes('assinei') ||
        text.includes('ja assinei') ||
        text.includes('já assinei') ||
        text.includes('contrato assinado') ||
        text.includes('assinado com sucesso') ||
        text.includes('acabei de assinar');

    if (isContractSigned) {
        return {
            primaryIntent: 'contract_signed',
            secondaryRequest: 'none',
            isClientExplicit: true,
            confidence: 0.99,
            providerUsed: providerName,
            modelUsed: 'heuristic-rule-engine',
            actionDetail: 'contract_signed',
        };
    }

    // 2. Pending Action Confirmation Checks
    if (context?.hasPendingAction) {
        const isYes =
            text === 'sim' ||
            text === 's' ||
            text === 'yes' ||
            text === 'y' ||
            text.includes('confirmo') ||
            text.includes('pode ser') ||
            text.includes('positivo') ||
            text.includes('com certeza') ||
            text.includes('pode mudar') ||
            text.includes('quero sim') ||
            text.includes('prosseguir') ||
            text.includes('confirmar');

        if (isYes) {
            return {
                primaryIntent: 'confirmation_yes',
                secondaryRequest: 'none',
                isClientExplicit: true,
                confidence: 0.99,
                providerUsed: providerName,
                modelUsed: 'heuristic-rule-engine',
                actionDetail: 'confirm_pending_action',
            };
        }

        const isNo =
            text === 'não' ||
            text === 'nao' ||
            text === 'n' ||
            text === 'no' ||
            text.includes('cancela') ||
            text.includes('esquece') ||
            text.includes('deixa quieto') ||
            text.includes('não quero') ||
            text.includes('nao quero') ||
            text.includes('deixa assim') ||
            text.includes('desistir');

        if (isNo) {
            return {
                primaryIntent: 'confirmation_no',
                secondaryRequest: 'none',
                isClientExplicit: true,
                confidence: 0.99,
                providerUsed: providerName,
                modelUsed: 'heuristic-rule-engine',
                actionDetail: 'cancel_pending_action',
            };
        }
    }

    // Customer Registration Intent (Visitor / Prospect)
    const isRegistration =
        text.includes('registrar') ||
        text.includes('registro') ||
        text.includes('cadastrar') ||
        text.includes('cadastro') ||
        text.includes('criar conta') ||
        text.includes('abrir conta') ||
        text.includes('novo cliente') ||
        text.includes('novo cadastro');

    if (isRegistration && !text.includes('mudar') && !text.includes('trocar')) {
        let regTarget: string | undefined = undefined;

        if (text.includes('pro') || text.includes('professional')) {
            regTarget = 'Professional';
        }

        if (text.includes('premium') || text.includes('business')) {
            regTarget = 'Premium Business';
        }

        if (text.includes('starter') || text.includes('barato')) {
            regTarget = 'Starter';
        }

        return {
            primaryIntent: 'customer_registration',
            secondaryRequest: 'none',
            isClientExplicit: true,
            confidence: 0.95,
            targetPlan: regTarget,
            providerUsed: providerName,
            modelUsed: 'heuristic-rule-engine',
            actionDetail: 'customer_registration',
        };
    }

    // Plan Subscription Intent (Visitor / Prospect)
    const isPlanSubscription =
        text.includes('assinar') ||
        text.includes('contratar') ||
        text.includes('quero assinar') ||
        text.includes('quero contratar') ||
        text.includes('escolho o plano') ||
        text.includes('quero o plano') ||
        text.includes('vou querer o plano') ||
        text.includes('assinar plano') ||
        text.includes('plano urbano') ||
        text.includes('plano rural') ||
        text.includes('600 mega') ||
        text.includes('800 mega') ||
        text.includes('1 giga') ||
        text.includes('1gb');

    if (isPlanSubscription && !text.includes('mudar') && !text.includes('trocar')) {
        let subTarget: string | undefined = undefined;
        const isRural = text.includes('rural');

        if (isRural) {
            if (text.includes('1gb') || text.includes('1 giga') || text.includes('1000') || text.includes('120')) {
                subTarget = 'Rural 1 Giga';
            }

            if (!subTarget && (text.includes('800') || text.includes('110'))) {
                subTarget = 'Rural 800 Mega';
            }

            if (!subTarget) {
                subTarget = 'Rural 600 Mega';
            }
        }

        if (!isRural) {
            if (
                text.includes('1gb') ||
                text.includes('1 giga') ||
                text.includes('1000') ||
                text.includes('99.99') ||
                text.includes('99,99')
            ) {
                subTarget = 'Urbano 1 Giga';
            }

            if (
                !subTarget &&
                (text.includes('800') || text.includes('89.99') || text.includes('89,99') || text.includes('89'))
            ) {
                subTarget = 'Urbano 800 Mega';
            }

            if (!subTarget) {
                subTarget = 'Urbano 600 Mega';
            }
        }

        return {
            primaryIntent: 'plan_subscription',
            secondaryRequest: 'none',
            isClientExplicit: true,
            confidence: 0.95,
            targetPlan: subTarget,
            providerUsed: providerName,
            modelUsed: 'heuristic-rule-engine',
            actionDetail: 'plan_subscription',
        };
    }

    // 2. Cancellation Intent
    const isCancellation =
        text.includes('cancelar') ||
        text.includes('cancela') ||
        text.includes('cancelamento') ||
        text.includes('encerrar plano') ||
        text.includes('encerrar contrato') ||
        text.includes('desistir da assinatura') ||
        text.includes('tirar minha internet');

    if (isCancellation) {
        primaryIntent = 'cancellation';
        actionDetail = 'request_cancellation';
    }

    // 3. Knowledge & Information Inquiry (Company address, business hours, in-person attendance, exceptions)
    const isCustomerDataQuery =
        text.includes('meu telefone') ||
        text.includes('telefone cadastrado') ||
        text.includes('meu cpf') ||
        text.includes('cpf cadastrado') ||
        text.includes('meus dados') ||
        text.includes('meu plano');

    const isPlanOrAreaSelectionIntent =
        text.includes('plano') ||
        text.includes('planos') ||
        text.includes('assinar') ||
        text.includes('contratar') ||
        text.includes('mudar') ||
        text.includes('trocar') ||
        text.includes('minha área') ||
        text.includes('minha area') ||
        text.includes('dentro da cidade') ||
        text.includes('sítio / arredores') ||
        text.includes('sitio / arredores') ||
        text.includes('área urbana') ||
        text.includes('area urbana') ||
        text.includes('área rural') ||
        text.includes('area rural') ||
        text.includes('zona rural') ||
        text.includes('zona urbana') ||
        text.includes('planos rurais') ||
        text.includes('planos urbanos');

    const isCoverageQuery =
        text.includes('cobertura') ||
        text.includes('área de cobertura') ||
        text.includes('area de cobertura') ||
        text.includes('área atendida') ||
        text.includes('area atendida') ||
        text.includes('atendem em') ||
        text.includes('atende em') ||
        text.includes('atendem na') ||
        text.includes('atende na');

    const isKnowledgeInquiry =
        !isCustomerDataQuery &&
        !isPlanOrAreaSelectionIntent &&
        (text.includes('onde fica') ||
            text.includes('qual o endereço') ||
            text.includes('qual o endereco') ||
            text.includes('endereço da empresa') ||
            text.includes('endereco da empresa') ||
            text.includes('endereço de vocês') ||
            text.includes('endereco de voces') ||
            text.includes('atendimento presencial') ||
            text.includes('atendem presencial') ||
            text.includes('atendimento físico') ||
            text.includes('posso ir aí') ||
            text.includes('posso ir ai') ||
            text.includes('horário de atendimento') ||
            text.includes('horario de atendimento') ||
            text.includes('horário de funcionamento') ||
            text.includes('horario de funcionamento') ||
            text.includes('qual o horário') ||
            text.includes('qual o horario') ||
            text.includes('que horas abre') ||
            text.includes('que horas fecha') ||
            text.includes('abre hoje') ||
            text.includes('aberto hoje') ||
            text.includes('funciona hoje') ||
            text.includes('quarta-feira') ||
            text.includes('quarta feira') ||
            text.includes('sábado') ||
            text.includes('sabado') ||
            text.includes('cajuru') ||
            text.includes('salgados') ||
            isCoverageQuery ||
            text.includes('mesh') ||
            text.includes('roteador') ||
            text.includes('link dedicado') ||
            text.includes('wifi corporativo') ||
            text.includes('wi-fi corporativo') ||
            text.includes('fibra optica') ||
            text.includes('fibra óptica') ||
            (text.includes('telefone') && !text.includes('meu')) ||
            (text.includes('contato') && !text.includes('meu')) ||
            text.includes('email da empresa') ||
            text.includes('e-mail da empresa') ||
            text.includes('feriado') ||
            (text.includes('presencial') && !text.includes('assinar')));

    if (primaryIntent === 'unknown' && isKnowledgeInquiry) {
        primaryIntent = 'knowledge_inquiry';
        actionDetail = 'knowledge_inquiry';
    }

    // 4. Address Change Intent
    const isAddressChange =
        !isKnowledgeInquiry &&
        (text.includes('mudei') ||
            (text.includes('endereço') &&
                (text.includes('mudar') ||
                    text.includes('trocar') ||
                    text.includes('novo') ||
                    text.includes('alterar'))) ||
            (text.includes('endereco') &&
                (text.includes('mudar') ||
                    text.includes('trocar') ||
                    text.includes('novo') ||
                    text.includes('alterar'))) ||
            text.includes('mudar de casa') ||
            text.includes('trocar rua') ||
            text.includes('novo endereço'));

    if (primaryIntent === 'unknown' && isAddressChange) {
        primaryIntent = 'address_change';
        actionDetail = 'request_address_change';

        const addressRegex =
            /(?:rua|avenida|av\.?|alameda|travessa|rodovia|praça)\s+[^,\n]+(?:\s*,\s*\d+)?(?:\s*-\s*[^,\n]+)?/i;
        const addressMatch = rawText.match(addressRegex);

        if (addressMatch) {
            extractedAddress = addressMatch[0].trim();
        }

        if (!extractedAddress) {
            const genericTargetMatch = rawText.match(
                /(?:para|pra|novo endereço:?)\s+([a-záàâãéèêíïóôõöúçñ0-9\s,.-]+)/i
            );

            if (genericTargetMatch && genericTargetMatch[1].trim().length > 3) {
                extractedAddress = genericTargetMatch[1].trim();
            }
        }
    }

    // 4. Plan Change Intent (Upgrade / Downgrade / Switch)
    const isPlanChange =
        text.includes('mudar plano') ||
        text.includes('trocar plano') ||
        text.includes('mudar pro') ||
        text.includes('mudar para') ||
        text.includes('trocar pro') ||
        text.includes('trocar para') ||
        text.includes('muda meu plano') ||
        text.includes('mais barato') ||
        text.includes('mais em conta') ||
        text.includes('downgrade') ||
        (context?.previousBotMessage &&
            context.previousBotMessage.toLowerCase().includes('change your current subscription') &&
            (text.includes('starter') ||
                text.includes('barato') ||
                text.includes('pro') ||
                text.includes('mudar') ||
                text.includes('trocar')));

    if (primaryIntent === 'unknown' && isPlanChange) {
        primaryIntent = 'plan_change';
        actionDetail = 'request_plan_change';

        if (text.includes('barato') || text.includes('em conta') || text.includes('menor valor')) {
            targetPlan = 'cheapest';
        }

        if (text.includes('rural')) {
            if (text.includes('1gb') || text.includes('1 giga') || text.includes('1000')) {
                targetPlan = 'Rural 1 Giga';
            }

            if (!targetPlan && text.includes('800')) {
                targetPlan = 'Rural 800 Mega';
            }

            if (!targetPlan) {
                targetPlan = 'Rural 600 Mega';
            }
        }

        if (!targetPlan) {
            if (text.includes('1gb') || text.includes('1 giga') || text.includes('1000')) {
                targetPlan = 'Urbano 1 Giga';
            }

            if (text.includes('800')) {
                targetPlan = 'Urbano 800 Mega';
            }

            if (text.includes('600')) {
                targetPlan = 'Urbano 600 Mega';
            }
        }
    }

    // 5. Human Handoff Intent
    const isHumanHandoff =
        text.includes('atendente') ||
        text.includes('humano') ||
        text.includes('falar com pessoa') ||
        text.includes('operador');

    if (primaryIntent === 'unknown' && isHumanHandoff) {
        primaryIntent = 'human_handoff';
    }

    // 6. Secondary Request Detection
    const asksForInvoice =
        text.includes('fatura') || text.includes('boleto') || text.includes('segunda via') || text.includes('invoice');

    if (asksForInvoice) {
        secondaryRequest = 'invoice_request';
    }

    const asksForUpgrade = text.includes('upgrade') || text.includes('aumentar plano');

    if (asksForUpgrade) {
        secondaryRequest = 'plan_upgrade';
    }

    // 7. Technical Support Intent
    const isTechSupport =
        text.includes('caiu') ||
        text.includes('problema') ||
        text.includes('quebrado') ||
        text.includes('fora do ar') ||
        text.includes('erro') ||
        text.includes('bug') ||
        text.includes('offline') ||
        text.includes('piscando') ||
        text.includes('luz vermelha') ||
        text.includes('sem sinal') ||
        text.includes('lenta') ||
        text.includes('não funciona') ||
        text.includes('nao funciona');

    if (primaryIntent === 'unknown' && isTechSupport) {
        primaryIntent = 'technical_support';
    }

    // 8. Financial Intent
    const isFinancial =
        text.includes('fatura') ||
        text.includes('boleto') ||
        text.includes('pagamento') ||
        text.includes('cobrança') ||
        text.includes('cobranca') ||
        text.includes('extrato') ||
        text.includes('segunda via');

    if (primaryIntent === 'unknown' && isFinancial) {
        primaryIntent = 'financial';
        secondaryRequest = 'none';
    }

    // 9. Plan Pricing, Current Plan Inquiries & Area Selection
    const isPricing =
        text.includes('plano') ||
        text.includes('planos') ||
        text.includes('preco') ||
        text.includes('preço') ||
        text.includes('valor') ||
        text.includes('quanto custa') ||
        text.includes('tabela') ||
        text.includes('quais planos') ||
        text.includes('qual meu plano') ||
        text.includes('qual é o meu plano') ||
        text.includes('meu plano') ||
        text.includes('área rural') ||
        text.includes('area rural') ||
        text.includes('zona rural') ||
        text.includes('área urbana') ||
        text.includes('area urbana') ||
        text.includes('zona urbana') ||
        text.includes('dentro da cidade') ||
        text.includes('nos arredores') ||
        text.includes('sítio / arredores') ||
        text.includes('sitio / arredores') ||
        text.includes('minha área') ||
        text.includes('minha area') ||
        text.includes('sítio') ||
        text.includes('sitio');

    if (primaryIntent === 'unknown' && isPricing) {
        primaryIntent = 'plan_pricing';
    }

    // 10. Greeting
    const isGreeting =
        text.startsWith('oi') ||
        text.startsWith('olá') ||
        text.startsWith('ola') ||
        text.startsWith('hello') ||
        text.startsWith('hi') ||
        text.startsWith('bom dia') ||
        text.startsWith('boa tarde') ||
        text.startsWith('boa noite');

    if (primaryIntent === 'unknown' && isGreeting) {
        primaryIntent = 'greeting';
    }

    // Extract identifier (phone numbers or CPF/CNPJ patterns)
    const phoneOrIdPattern = /\b(?:\d{10,13}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
    const identifierMatch = rawText.match(phoneOrIdPattern);
    const extractedIdentifier = identifierMatch ? identifierMatch[0] : undefined;

    const isClientExplicit = Boolean(extractedIdentifier) || text.includes('sou cliente') || text.includes('meu cpf');

    const suggestedOptions = [
        'Consultar meus planos e valores',
        '2ª via da fatura ou boleto',
        'Suporte técnico para conexão',
        'Alterar meu endereço cadastral',
        'Falar com um atendente',
    ];

    return {
        primaryIntent,
        secondaryRequest,
        isClientExplicit,
        extractedIdentifier,
        confidence: primaryIntent === 'unknown' ? 0.4 : 0.88,
        providerUsed: providerName,
        modelUsed: 'heuristic-rule-engine',
        actionDetail,
        targetPlan,
        extractedAddress,
        suggestedOptions,
    };
}
