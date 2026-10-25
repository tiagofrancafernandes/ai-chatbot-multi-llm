import { IntentAnalysisResult, PrimaryIntent, SecondaryRequest } from '../interfaces/llm-provider.interface';

export const INTENT_SYSTEM_PROMPT = `
You are an expert AI triage classifier. Analyze the user text and output ONLY a valid JSON object.
Schema:
{
    "primaryIntent": "greeting" | "plan_pricing" | "technical_support" | "financial" | "unknown",
    "secondaryRequest": "none" | "invoice_request" | "plan_upgrade",
    "isClientExplicit": boolean,
    "extractedIdentifier": string | null
}

Classification Criteria:
- "greeting": Initial greetings such as "oi", "ola", "hello", "hi", "bom dia".
- "plan_pricing": Questions about plans, subscriptions, pricing, values, "quanto custa", "quais planos".
- "technical_support": System down, bugs, connection issues, offline, broken app, "caiu de novo", "não funciona".
- "financial": Invoices, statements, billing questions, "fatura", "boleto", "segunda via".
- "unknown": Anything unrelated.

Secondary Request:
- "invoice_request": User explicitly asked for a bill, invoice, or 2nd copy ("mandar a segunda via da fatura", "me manda a fatura").
- "plan_upgrade": User wants to upgrade, change or update plan.
- "none": No second request.

isClientExplicit:
- true if the user claims to be a customer, provides a phone number, CPF/CNPJ, or says "sou cliente". Otherwise false.

extractedIdentifier:
- Extract any phone number, CPF, CNPJ, or customer UUID present in the text, or null.
`;

export function evaluateFallbackIntent(rawText: string, providerName = 'heuristic'): IntentAnalysisResult {
    const text = rawText.toLowerCase().trim();

    let primaryIntent: PrimaryIntent = 'unknown';
    let secondaryRequest: SecondaryRequest = 'none';

    // Heuristics for secondary request
    const asksForInvoice = text.includes('fatura') || text.includes('boleto') || text.includes('segunda via') || text.includes('invoice');

    if (asksForInvoice) {
        secondaryRequest = 'invoice_request';
    }

    const asksForUpgrade = text.includes('mudar plano') || text.includes('upgrade') || text.includes('trocar plano');

    if (asksForUpgrade) {
        secondaryRequest = 'plan_upgrade';
    }

    // Heuristics for primary intent
    const isTechSupport =
        text.includes('caiu') ||
        text.includes('problema') ||
        text.includes('quebrado') ||
        text.includes('fora do ar') ||
        text.includes('erro') ||
        text.includes('bug') ||
        text.includes('offline') ||
        text.includes('não funciona');

    if (isTechSupport) {
        primaryIntent = 'technical_support';
    }

    if (primaryIntent === 'unknown') {
        const isPricing =
            text.includes('plano') ||
            text.includes('preco') ||
            text.includes('preço') ||
            text.includes('valor') ||
            text.includes('quanto custa') ||
            text.includes('tabela');

        if (isPricing) {
            primaryIntent = 'plan_pricing';
        }
    }

    if (primaryIntent === 'unknown') {
        const isFinancial =
            text.includes('fatura') ||
            text.includes('boleto') ||
            text.includes('pagamento') ||
            text.includes('cobrança') ||
            text.includes('segunda via');

        if (isFinancial) {
            primaryIntent = 'financial';
            secondaryRequest = 'none';
        }
    }

    if (primaryIntent === 'unknown') {
        const isGreeting =
            text.startsWith('oi') ||
            text.startsWith('olá') ||
            text.startsWith('ola') ||
            text.startsWith('hello') ||
            text.startsWith('hi') ||
            text.startsWith('bom dia') ||
            text.startsWith('boa tarde') ||
            text.startsWith('boa noite');

        if (isGreeting) {
            primaryIntent = 'greeting';
        }
    }

    // Extract identifier (phone numbers or CPF/CNPJ patterns)
    const phoneOrIdPattern = /\b(?:\d{10,13}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
    const identifierMatch = rawText.match(phoneOrIdPattern);
    const extractedIdentifier = identifierMatch ? identifierMatch[0] : undefined;

    const isClientExplicit = Boolean(extractedIdentifier) || text.includes('sou cliente') || text.includes('meu cpf');

    return {
        primaryIntent,
        secondaryRequest,
        isClientExplicit,
        extractedIdentifier,
        confidence: 0.85,
        providerUsed: providerName,
        modelUsed: 'heuristic-rule-engine',
    };
}
