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
    "primaryIntent": "greeting" | "plan_pricing" | "plan_subscription" | "contract_signed" | "simulate_signature" | "plan_change" | "cancellation" | "address_change" | "technical_support" | "financial" | "confirmation_yes" | "confirmation_no" | "human_handoff" | "unknown",
    "secondaryRequest": "none" | "invoice_request" | "plan_upgrade",
    "actionDetail": string | null,
    "targetPlan": "cheapest" | "Starter" | "Professional" | "Premium Business" | null,
    "extractedAddress": string | null (extract address ONLY if present in the user text itself, otherwise null),
    "isClientExplicit": boolean,
    "extractedIdentifier": string | null,
    "suggestedOptions": string[]
}

Intent Definitions:
- "greeting": "oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello".
- "plan_pricing": Inquiries about available plans, pricing, values, or asking "qual meu plano atual?".
- "plan_subscription": User (visitor/prospect) wants to hire/subscribe to a plan (e.g. "quero assinar o plano Starter", "contratar o plano pro", "assinar de 49.90").
- "contract_signed": User informs they signed the digital contract ("já assinei", "assinei o contrato", "contrato assinado").
- "simulate_signature": User wants to simulate digital signature ("simular assinatura", "simular contrato").
- "plan_change": User wants to change, switch, upgrade, or downgrade plan (e.g., "mudar pro mais barato", "trocar pro Starter", "muda meu plano").
- "cancellation": User wants to cancel subscription or contract (e.g., "quero cancelar", "cancela meu plano", "encerrar assinatura").
- "address_change": User requests address update (e.g., "mudei de casa", "trocar meu endereço pra Rua X 123", "novo endereço").
- "technical_support": Connection outages, slow speed, blinking red router lights, system errors, "caiu a net", "modem piscando".
- "financial": Invoices, boletos, 2nd copy, billing, debts, payment inquiries.
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

    // 1. Pending Action Confirmation Checks
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

    // Contract Simulation & Signature Checks
    if (text.includes('simular assinatura') || text.includes('simular contrato')) {
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

    // Plan Subscription Intent (Visitor / Prospect)
    const isPlanSubscription =
        text.includes('assinar') ||
        text.includes('contratar') ||
        text.includes('quero assinar') ||
        text.includes('quero contratar') ||
        text.includes('escolho o plano') ||
        text.includes('quero o plano') ||
        text.includes('vou querer o plano') ||
        text.includes('assinar plano');

    if (isPlanSubscription && !text.includes('mudar') && !text.includes('trocar')) {
        let subTarget = 'Starter';

        if (text.includes('pro') || text.includes('professional')) {
            subTarget = 'Professional';
        }

        if (text.includes('premium') || text.includes('business')) {
            subTarget = 'Premium Business';
        }

        if (text.includes('starter') || text.includes('barato')) {
            subTarget = 'Starter';
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

    // 3. Address Change Intent
    const isAddressChange =
        text.includes('mudei') ||
        text.includes('endereço') ||
        text.includes('endereco') ||
        text.includes('mudar de casa') ||
        text.includes('trocar rua') ||
        text.includes('novo endereço');

    if (isAddressChange) {
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

        if (text.includes('starter')) {
            targetPlan = 'Starter';
        }

        if (text.includes('pro') || text.includes('professional')) {
            targetPlan = 'Professional';
        }

        if (text.includes('business') || text.includes('premium')) {
            targetPlan = 'Premium Business';
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

    // 9. Plan Pricing Inquiries
    const isPricing =
        text.includes('plano') ||
        text.includes('preco') ||
        text.includes('preço') ||
        text.includes('valor') ||
        text.includes('quanto custa') ||
        text.includes('tabela') ||
        text.includes('quais planos') ||
        text.includes('qual meu plano');

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
