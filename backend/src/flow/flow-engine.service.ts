import { Injectable, Logger } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { LlmService } from '../llm/llm.service';
import { Customer } from '../common/interfaces/customer.interface';
import { ChatSession, ChatMessage } from '../common/interfaces/chat.interface';
import { IntentAnalysisResult, IntentContext } from '../llm/interfaces/llm-provider.interface';
import { FlowDefinition, FlowNode } from '../common/interfaces/flow.interface';

export interface ProcessMessageParams {
    text: string;
    session: ChatSession;
    customer: Customer;
    providerId?: string;
    modelOverride?: string;
}

export interface ProcessMessageResult {
    botResponse: string;
    analysis: IntentAnalysisResult;
    customer: Customer;
    session: ChatSession;
    activeNodeId: string;
}

interface StepRoutingOutcome {
    response: string;
    nodeId: string;
    options?: string[];
    updatedCustomer?: Customer;
}

@Injectable()
export class FlowEngineService {
    private readonly logger = new Logger(FlowEngineService.name);

    constructor(
        private readonly databaseService: JsonDatabaseService,
        private readonly llmService: LlmService
    ) {}

    public async processMessage(params: ProcessMessageParams): Promise<ProcessMessageResult> {
        const { text, session, providerId, modelOverride } = params;
        let customer = params.customer;

        if (!text || text.trim().length === 0) {
            throw new Error('Message text cannot be empty');
        }

        const flow = this.databaseService.getFlow();

        // Build Intent Context from conversation history
        const previousBotMessages = session.messages.filter((m) => m.sender === 'bot');
        const lastBotMessage =
            previousBotMessages.length > 0 ? previousBotMessages[previousBotMessages.length - 1].text : undefined;

        const intentContext: IntentContext = {
            previousBotMessage: lastBotMessage,
            hasPendingAction: Boolean(session.pendingAction),
            pendingActionType: session.pendingAction?.type,
            customerPlan: customer.plan,
        };

        // Step 1: Execute AI Intent Decision Node with Context
        const analysis = await this.llmService.analyzeIntent(text, providerId, modelOverride, intentContext);

        session.currentIntent = analysis.primaryIntent;
        session.secondaryRequest = analysis.secondaryRequest;

        // Step 2: Identification & Authentication Guard
        if (!customer.isIdentified) {
            const authResult = this.tryAuthenticateCustomer(text, analysis, customer, session, flow);

            if (authResult.isHandled) {
                return this.finalizeStep(
                    authResult.response,
                    analysis,
                    authResult.updatedCustomer,
                    session,
                    authResult.nodeId,
                    authResult.options
                );
            }
        }

        // Step 3: Handle Pending Action Confirmations (if active)
        if (session.pendingAction) {
            const confirmationOutcome = this.handlePendingConfirmation(text, analysis, session, customer);

            if (confirmationOutcome) {
                return this.finalizeStep(
                    confirmationOutcome.response,
                    analysis,
                    confirmationOutcome.updatedCustomer || customer,
                    session,
                    confirmationOutcome.nodeId,
                    confirmationOutcome.options
                );
            }
        }

        // Step 4: Routing for Authenticated Customers across Intents
        const routedResult = this.routeIdentifiedCustomer(text, analysis, customer, flow, session);
        let botResponse = routedResult.response;
        const activeNodeId = routedResult.nodeId;
        const options = routedResult.options;

        if (routedResult.updatedCustomer) {
            customer = routedResult.updatedCustomer;
        }

        // Step 5: Process Secondary Request Interceptor
        const secondaryNotice = this.processSecondaryRequest(analysis, customer);

        if (secondaryNotice) {
            botResponse = `${botResponse}\n\n${secondaryNotice}`;
        }

        return this.finalizeStep(botResponse, analysis, customer, session, activeNodeId, options);
    }

    private handlePendingConfirmation(
        text: string,
        analysis: IntentAnalysisResult,
        session: ChatSession,
        customer: Customer
    ): StepRoutingOutcome | null {
        const pending = session.pendingAction;

        if (!pending) {
            return null;
        }

        const isYes = this.isAffirmativeConfirmation(text, analysis);
        const isNo = this.isNegativeConfirmation(text, analysis);

        // User confirmed action
        if (isYes) {
            if (pending.type === 'plan_change' && pending.targetPlan) {
                const oldPlan = customer.plan || 'Nenhum';
                const newPlan = pending.targetPlan;

                customer.plan = newPlan;
                this.databaseService.saveCustomer(customer);
                session.pendingAction = null;

                const response = `✅ **Plano alterado com sucesso!**\n\nSeu plano foi atualizado de "${oldPlan}" para o **"${newPlan}"**.\nAs novas condições e valores já estão valendo para sua conta.`;
                const options = [
                    'Quais são os recursos do meu novo plano?',
                    'Ver minhas faturas',
                    'Voltar ao menu inicial',
                ];

                return {
                    response,
                    nodeId: 'node_plan_change_action',
                    options,
                    updatedCustomer: customer,
                };
            }

            if (pending.type === 'cancellation') {
                const planName = customer.plan || 'ativo';
                const dateStr = new Date().toLocaleDateString('pt-BR');

                customer.notes = `${customer.notes ? customer.notes + ' | ' : ''}Cancelamento solicitado em ${dateStr}`;

                if (!customer.metadata) {
                    customer.metadata = {};
                }

                customer.metadata.cancellationRequest = {
                    requestedAt: Date.now(),
                    status: 'pending_retention_contact',
                };

                this.databaseService.saveCustomer(customer);
                session.pendingAction = null;

                const response = `⚠️ **Solicitação de Cancelamento Registrada**\n\nProtocolo: #CAN-${Date.now().toString().slice(-6)}\nRegistramos a solicitação de encerramento do plano **"${planName}"**.\nNossa equipe especializada entrará em contato em até 24 horas úteis para os procedimentos finais e devolução de comodatos.\n\nSe mudar de ideia ou quiser negociar condições especiais, estamos sempre à disposição!`;
                const options = ['Ver ofertas promocionais', 'Ver faturas pendentes', 'Falar com atendente'];

                return {
                    response,
                    nodeId: 'node_cancellation_action',
                    options,
                    updatedCustomer: customer,
                };
            }

            if (pending.type === 'address_change' && pending.targetAddress) {
                const newAddress = pending.targetAddress;

                if (!customer.metadata) {
                    customer.metadata = {};
                }

                customer.metadata.address = newAddress;
                this.databaseService.saveCustomer(customer);
                session.pendingAction = null;

                const response = `✅ **Endereço atualizado com sucesso!**\n\nO novo endereço cadastrado para instalação e faturamento é:\n📍 **${newAddress}**\n\nNossos registros foram sincronizados com sucesso.`;
                const options = ['Agendar visita técnica de mudança', 'Consultar dados cadastrais', 'Menu principal'];

                return {
                    response,
                    nodeId: 'node_address_change_action',
                    options,
                    updatedCustomer: customer,
                };
            }
        }

        // User cancelled/aborted action
        if (isNo) {
            session.pendingAction = null;

            const response = `Entendido! A solicitação foi cancelada e nenhuma alteração foi realizada na sua conta.\nSeu plano permanece ativo como **"${customer.plan || 'padrão'}"**.\n\nComo mais posso te ajudar?`;
            const options = ['Consultar planos disponíveis', 'Ver minhas faturas', 'Suporte técnico'];

            return {
                response,
                nodeId: 'node_action_confirmation',
                options,
                updatedCustomer: customer,
            };
        }

        return null;
    }

    private isAffirmativeConfirmation(text: string, analysis: IntentAnalysisResult): boolean {
        if (analysis.primaryIntent === 'confirmation_yes') {
            return true;
        }

        const lower = text.toLowerCase().trim();
        return (
            lower.startsWith('sim') ||
            lower === 's' ||
            lower === 'yes' ||
            lower.includes('confirmo') ||
            lower.includes('pode mudar') ||
            lower.includes('pode alterar') ||
            lower.includes('pode cancelar') ||
            lower.includes('quero sim') ||
            lower.includes('com certeza') ||
            lower.includes('positivo')
        );
    }

    private isNegativeConfirmation(text: string, analysis: IntentAnalysisResult): boolean {
        if (analysis.primaryIntent === 'confirmation_no') {
            return true;
        }

        const lower = text.toLowerCase().trim();
        return (
            lower.startsWith('não') ||
            lower.startsWith('nao') ||
            lower === 'n' ||
            lower === 'no' ||
            lower.includes('cancela') ||
            lower.includes('deixa quieto') ||
            lower.includes('não quero') ||
            lower.includes('nao quero') ||
            lower.includes('esquece') ||
            lower.includes('deixa assim')
        );
    }

    private tryAuthenticateCustomer(
        text: string,
        analysis: IntentAnalysisResult,
        currentCustomer: Customer,
        session: ChatSession,
        flow: FlowDefinition
    ): { isHandled: boolean; response: string; nodeId: string; updatedCustomer: Customer; options?: string[] } {
        const candidateIdentifier = analysis.extractedIdentifier || this.extractPhoneOrCpf(text);

        if (candidateIdentifier) {
            const matchedCustomer = this.databaseService.findCustomerByIdentifier(candidateIdentifier);

            if (matchedCustomer) {
                matchedCustomer.isIdentified = true;
                this.databaseService.saveCustomer(matchedCustomer);

                session.customerId = matchedCustomer.id;

                const response = `Identidade confirmada! Bem-vindo de volta, **${matchedCustomer.name || 'cliente'}**.\nPlano atual: **${matchedCustomer.plan || 'Sem plano'}**.\n\nComo posso te ajudar hoje?`;
                const options = [
                    'Qual é o meu plano atual?',
                    'Quero mudar para o plano mais barato',
                    'Ver minhas faturas',
                    'Suporte técnico',
                ];

                return {
                    isHandled: true,
                    response,
                    nodeId: 'node_customer_auth_action',
                    updatedCustomer: matchedCustomer,
                    options,
                };
            }

            const response = `Não localizamos nenhum cadastro com "${candidateIdentifier}". Você pode consultar nossos planos públicos ou falar com um atendente.`;
            const options = ['Ver planos públicos', 'Tentar outro telefone ou CPF', 'Falar com atendente'];

            return {
                isHandled: true,
                response,
                nodeId: 'node_customer_auth_action',
                updatedCustomer: currentCustomer,
                options,
            };
        }

        if (analysis.primaryIntent === 'plan_pricing') {
            const pricingNode = this.findNode(flow, 'node_plan_pricing_action');
            const plans = this.databaseService.getPlans();
            const planLines = plans.map((p) => `• ${p.name}: R$ ${p.price.toFixed(2)}/mês (${p.features.join(', ')})`);
            const response = `Aqui estão nossos planos de assinatura disponíveis:\n\n${planLines.join('\n')}\n\nSe você já é cliente, informe seu telefone ou CPF cadastrado (ex: '5511999999999') para acessar sua conta!`;
            const options = ['Meu telefone é 5511999999999', 'Meu CPF é 123.456.789-00', 'Falar com atendente'];

            return {
                isHandled: true,
                response,
                nodeId: pricingNode?.id || 'node_plan_pricing_action',
                updatedCustomer: currentCustomer,
                options,
            };
        }

        if (analysis.primaryIntent === 'greeting') {
            const response = `Olá! Seja bem-vindo ao nosso atendimento inteligente.\n\nPara acessar seus dados e serviços com segurança, por favor informe seu número de telefone ou CPF cadastrado (ex: '5511999999999'). Ou consulte nossos planos disponíveis!`;
            const options = ['Meu telefone é 5511999999999', 'Ver planos disponíveis', 'Suporte técnico'];

            return {
                isHandled: true,
                response,
                nodeId: 'node_customer_auth_action',
                updatedCustomer: currentCustomer,
                options,
            };
        }

        const response = `Olá! Para acessar sua conta e solicitar alterações, informe seu número de telefone ou CPF cadastrado (ex: '5511999999999').`;
        const options = ['Meu telefone é 5511999999999', 'Ver planos disponíveis', 'Falar com atendente'];

        return {
            isHandled: true,
            response,
            nodeId: 'node_customer_auth_action',
            updatedCustomer: currentCustomer,
            options,
        };
    }

    private routeIdentifiedCustomer(
        text: string,
        analysis: IntentAnalysisResult,
        customer: Customer,
        flow: FlowDefinition,
        session: ChatSession
    ): StepRoutingOutcome {
        const businessHours = this.databaseService.getBusinessHours();
        const plans = this.databaseService.getPlans();
        const lowerText = text.toLowerCase();

        // 1. Address Change Intent (Takes precedence if user explicitly mentions address)
        const userExplicitAddress = this.extractAddressFromText(text);
        const isAddressChangeIntent =
            Boolean(userExplicitAddress) ||
            (analysis.primaryIntent === 'address_change' &&
                (lowerText.includes('endereço') || lowerText.includes('endereco') || lowerText.includes('mudei'))) ||
            lowerText.includes('mudei de casa') ||
            lowerText.includes('novo endereço') ||
            lowerText.includes('novo endereco') ||
            lowerText.includes('alterar endereço') ||
            lowerText.includes('alterar endereco') ||
            lowerText.includes('trocar endereço') ||
            lowerText.includes('trocar endereco') ||
            (lowerText.includes('mudei') && !lowerText.includes('plano'));

        if (isAddressChangeIntent) {
            const targetAddress = userExplicitAddress || analysis.extractedAddress;

            if (targetAddress) {
                session.pendingAction = {
                    type: 'address_change',
                    targetAddress,
                    description: `Alteração de endereço para ${targetAddress}`,
                    createdAt: Date.now(),
                };

                const response = `⚠️ **Confirmação de Alteração de Endereço:**\n\nIdentifiquei a solicitação de alteração do seu endereço cadastral para:\n📍 **${targetAddress}**\n\nVocê confirma a atualização deste endereço em seu cadastro?`;
                const options = ['Sim, confirmar endereço', 'Não, cancelar alteração', 'Informar outro endereço'];

                return { response, nodeId: 'node_address_change_action', options };
            }

            const response = `Para atualizar seu endereço cadastral de instalação ou cobrança, por favor informe o novo endereço completo (Rua, Número, Bairro e Cidade):`;
            const options = ['Cancelar solicitação', 'Falar com atendente'];

            return { response, nodeId: 'node_address_change_action', options };
        }

        // 2. Cancellation Intent
        const isCancellationIntent =
            analysis.primaryIntent === 'cancellation' ||
            lowerText.includes('cancelar') ||
            lowerText.includes('cancela') ||
            lowerText.includes('cancelamento') ||
            lowerText.includes('encerrar contrato') ||
            lowerText.includes('desistir do plano');

        if (isCancellationIntent) {
            session.pendingAction = {
                type: 'cancellation',
                previousValue: customer.plan,
                description: `Cancelamento do plano ${customer.plan}`,
                createdAt: Date.now(),
            };

            const response = `⚠️ **Atenção - Ação Crítica:**\n\nVocê está solicitando o cancelamento do seu plano **"${customer.plan || 'de assinatura'}"**.\n\nAo cancelar, a sua conexão e benefícios serão interrompidos ao término do período vigente.\n\nVocê confirma que deseja prosseguir com a solicitação de cancelamento?`;
            const options = [
                'Sim, quero cancelar',
                'Não, manter meu plano atual',
                'Quero mudar para um plano mais barato',
            ];

            return { response, nodeId: 'node_cancellation_action', options };
        }

        // 3. Plan Change Intent (Upgrade / Downgrade / Switch)
        const isPlanChangeIntent =
            analysis.primaryIntent === 'plan_change' ||
            analysis.secondaryRequest === 'plan_upgrade' ||
            lowerText.includes('mais barato') ||
            lowerText.includes('mais em conta') ||
            lowerText.includes('mudar plano') ||
            lowerText.includes('trocar plano') ||
            lowerText.includes('mudar para o plano') ||
            lowerText.includes('mudar pro plano') ||
            lowerText.includes('trocar para o plano') ||
            lowerText.includes('trocar pro plano') ||
            lowerText.includes('muda meu plano') ||
            (lowerText.includes('mudar') &&
                (lowerText.includes('barato') || lowerText.includes('starter') || lowerText.includes('pro')));

        if (isPlanChangeIntent) {
            return this.handlePlanChangeRequest(analysis, customer, session, plans, lowerText);
        }

        // 4. Human Handoff Intent
        if (analysis.primaryIntent === 'human_handoff') {
            const response = `Transferindo para um atendente humano especializado. O tempo estimado de resposta é de aproximadamente 2 minutos.\n\nProtocolo: #ATD-${Date.now().toString().slice(-6)}.`;
            const options = ['Consultar meu plano', 'Ver faturas pendentes', 'Menu principal'];

            return { response, nodeId: 'node_fallback_message', options };
        }

        // 5. Greeting
        if (analysis.primaryIntent === 'greeting') {
            const greetingNode = this.findNode(flow, 'node_greeting_message');
            const template =
                greetingNode?.responseTemplate ||
                'Olá {{customerName}}! Que bom ter você aqui. Nosso horário de atendimento é de {{businessOpen}} às {{businessClose}}.';

            const response = template
                .replace('{{customerName}}', customer.name || 'Cliente')
                .replace('{{businessOpen}}', businessHours.open)
                .replace('{{businessClose}}', businessHours.close);

            const options = [
                'Qual é o meu plano atual?',
                'Quero mudar para o plano mais barato',
                'Ver minhas faturas',
                'Suporte técnico',
            ];

            return { response, nodeId: 'node_greeting_message', options };
        }

        // 6. Plan Pricing Inquiries
        if (analysis.primaryIntent === 'plan_pricing') {
            const planList = plans
                .map((p) => `• **${p.name}**: R$ ${p.price.toFixed(2)}/mês (${p.features.join(', ')})`)
                .join('\n');
            const currentPlanNotice = customer.plan
                ? `Seu plano atual é **"${customer.plan}"**.`
                : 'Você ainda não possui um plano ativo.';

            const response = `${currentPlanNotice}\n\nPlanos disponíveis:\n${planList}\n\nDeseja mudar de plano ou verificar opções mais econômicas?`;
            const options = ['Quero mudar para o plano mais barato', 'Ver minhas faturas', 'Menu principal'];

            return { response, nodeId: 'node_plan_pricing_action', options };
        }

        // 7. Technical Support Intent
        if (analysis.primaryIntent === 'technical_support') {
            const techNode = this.findNode(flow, 'node_tech_support_message');
            const template =
                techNode?.responseTemplate ||
                'Abrindo diagnóstico técnico imediato. A luz pontual ou indicador de sinal do seu modem está piscando em vermelho?';
            const options = [
                'A luz está piscando vermelha',
                'A luz está verde normal',
                'O modem está sem energia',
                'Falar com técnico',
            ];

            return { response: template, nodeId: 'node_tech_support_message', options };
        }

        // 8. Financial Intent
        if (analysis.primaryIntent === 'financial') {
            const pendingInvoices = customer.invoices.filter((inv) => inv.status === 'pending');
            const paidInvoices = customer.invoices.filter((inv) => inv.status === 'paid');

            let invoiceSummary = `Você possui ${customer.invoices.length} fatura(s) registrada(s) (${pendingInvoices.length} pendente(s), ${paidInvoices.length} paga(s)).`;

            if (pendingInvoices.length > 0) {
                const list = pendingInvoices
                    .map((inv) => `• Fatura ${inv.id}: R$ ${inv.amount.toFixed(2)} (Vencimento: ${inv.dueDate})`)
                    .join('\n');
                invoiceSummary += `\n\nFaturas pendentes:\n${list}\n\nLink direto para pagamento e 2ª via: https://billing.company.local/invoice/${customer.id}`;
            }

            if (pendingInvoices.length === 0) {
                invoiceSummary += `\nTodas as suas faturas estão em dia! Muito obrigado!`;
            }

            const options = [
                'Enviar 2ª via por e-mail',
                'Quero mudar para o plano mais barato',
                'Suporte técnico',
                'Menu principal',
            ];

            return { response: invoiceSummary, nodeId: 'node_financial_action', options };
        }

        // 9. Unknown / Beyond-the-flow Fallback with Smart Options & Alternatives
        const response = `Não consegui compreender com total clareza a sua mensagem, mas estou pronto para te ajudar!\n\nPor favor, escolha uma das alternativas abaixo ou escreva novamente com outras palavras o que você precisa:`;
        const options = [
            'Qual é o meu plano atual?',
            'Quero mudar para o plano mais barato',
            'Ver faturas e 2ª via',
            'Suporte técnico para conexão',
            'Alterar endereço cadastral',
            'Falar com um atendente',
        ];

        return { response, nodeId: 'node_fallback_message', options };
    }

    private handlePlanChangeRequest(
        analysis: IntentAnalysisResult,
        customer: Customer,
        session: ChatSession,
        plans: Array<{ id: string; name: string; price: number; features: string[] }>,
        lowerText = ''
    ): StepRoutingOutcome {
        // Sort plans by price ascending
        const sortedPlans = [...plans].sort((a, b) => a.price - b.price);
        const cheapestPlan = sortedPlans[0];

        const wantsCheapest =
            analysis.targetPlan === 'cheapest' ||
            lowerText.includes('barato') ||
            lowerText.includes('em conta') ||
            lowerText.includes('menor valor') ||
            analysis.actionDetail?.toLowerCase().includes('barato');

        if (wantsCheapest) {
            if (customer.plan === cheapestPlan.name) {
                const response = `Você já possui o nosso plano mais econômico, o **"${customer.plan}"** (R$ ${cheapestPlan.price.toFixed(2)}/mês).\n\nDeseja verificar os recursos inclusos ou falar com um atendente para condições personalizadas?`;
                const options = ['Ver benefícios do meu plano', 'Falar com atendente', 'Menu principal'];

                return { response, nodeId: 'node_plan_pricing_action', options };
            }

            session.pendingAction = {
                type: 'plan_change',
                targetPlan: cheapestPlan.name,
                previousValue: customer.plan,
                description: `Mudança do plano ${customer.plan} para o mais barato (${cheapestPlan.name})`,
                createdAt: Date.now(),
            };

            const response = `Identifiquei que você deseja alterar seu plano atual (**"${customer.plan || 'Plano Atual'}"**) para o plano mais econômico:\n\n⭐ **${cheapestPlan.name}** — R$ ${cheapestPlan.price.toFixed(2)}/mês (${cheapestPlan.features.join(', ')})\n\n⚠️ **Confirmação necessária:** Esta alteração modificará os recursos e o valor da sua fatura mensal.\n\nVocê confirma a alteração do seu plano para o **${cheapestPlan.name}**?`;
            const options = ['Sim, confirmo a mudança', 'Não, manter meu plano atual', 'Ver outros planos disponíveis'];

            return { response, nodeId: 'node_plan_change_action', options };
        }

        // User named a specific target plan (only if present in user text)
        const matchedTarget = plans.find(
            (p) =>
                p.name.toLowerCase() === (analysis.targetPlan || '').toLowerCase() &&
                lowerText.includes(p.name.toLowerCase())
        );

        if (matchedTarget) {
            if (customer.plan === matchedTarget.name) {
                const response = `Você já está utilizando o plano **"${matchedTarget.name}"**.\n\nDeseja explorar outros planos ou verificar sua fatura?`;
                const options = ['Ver outros planos', 'Ver minhas faturas', 'Menu principal'];

                return { response, nodeId: 'node_plan_pricing_action', options };
            }

            session.pendingAction = {
                type: 'plan_change',
                targetPlan: matchedTarget.name,
                previousValue: customer.plan,
                description: `Mudança para o plano ${matchedTarget.name}`,
                createdAt: Date.now(),
            };

            const response = `Identifiquei a solicitação de migração para o plano:\n\n⭐ **${matchedTarget.name}** — R$ ${matchedTarget.price.toFixed(2)}/mês (${matchedTarget.features.join(', ')})\n\n⚠️ **Confirmação necessária:** Esta alteração atualizará suas condições contratuais.\n\nVocê confirma a alteração do seu plano para o **${matchedTarget.name}**?`;
            const options = ['Sim, confirmo a mudança', 'Não, cancelar alteração', 'Ver outros planos'];

            return { response, nodeId: 'node_plan_change_action', options };
        }

        // Generic plan change request without identified target
        const userAskedToChangePlan =
            lowerText.includes('mudar') ||
            lowerText.includes('trocar') ||
            lowerText.includes('plano') ||
            analysis.primaryIntent === 'plan_change';

        if (userAskedToChangePlan) {
            const planList = plans
                .map((p) => `• **${p.name}**: R$ ${p.price.toFixed(2)}/mês (${p.features.join(', ')})`)
                .join('\n');
            const response = `Para qual dos planos abaixo você gostaria de alterar sua assinatura?\n\n${planList}`;
            const options = plans.map((p) => `Mudar para ${p.name}`);

            return { response, nodeId: 'node_plan_pricing_action', options };
        }

        // Otherwise out of flow / unknown
        const unknownResponse = `Não consegui compreender com total clareza a sua mensagem, mas estou pronto para te ajudar!\n\nPor favor, escolha uma das alternativas abaixo ou escreva novamente com outras palavras o que você precisa:`;
        const unknownOptions = [
            'Qual é o meu plano atual?',
            'Quero mudar para o plano mais barato',
            'Ver faturas e 2ª via',
            'Suporte técnico para conexão',
            'Alterar endereço cadastral',
            'Falar com um atendente',
        ];

        return { response: unknownResponse, nodeId: 'node_fallback_message', options: unknownOptions };
    }

    private processSecondaryRequest(analysis: IntentAnalysisResult, customer: Customer): string | null {
        if (analysis.secondaryRequest === 'invoice_request') {
            const pending = customer.invoices.filter((inv) => inv.status === 'pending');

            if (pending.length > 0) {
                const list = pending
                    .map((inv) => `[#${inv.id} - R$ ${inv.amount.toFixed(2)} vencimento ${inv.dueDate}]`)
                    .join(', ');
                return `[Aviso de Fatura]: Identificamos sua solicitação de 2ª via! Fatura(s) pendente(s): ${list}. Link de pagamento: https://billing.company.local/quick-pay/${customer.id}`;
            }

            return `[Aviso de Fatura]: Verificamos sua solicitação de fatura: Todas as suas faturas anteriores estão quitadas!`;
        }

        if (analysis.secondaryRequest === 'plan_upgrade') {
            return `[Aviso de Vendas]: Registramos seu interesse em upgrade de plano! Nossa equipe enviará condições promocionais.`;
        }

        return null;
    }

    private finalizeStep(
        botResponse: string,
        analysis: IntentAnalysisResult,
        customer: Customer,
        session: ChatSession,
        activeNodeId: string,
        options?: string[]
    ): ProcessMessageResult {
        session.activeNodeId = activeNodeId;
        session.updatedAt = Date.now();

        const botMessage: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            sender: 'bot',
            text: botResponse,
            timestamp: Date.now(),
            nodeId: activeNodeId,
            detectedIntent: analysis.primaryIntent,
            secondaryRequest: analysis.secondaryRequest,
            provider: analysis.providerUsed,
            model: analysis.modelUsed,
            options: options && options.length > 0 ? options : undefined,
        };

        session.messages.push(botMessage);

        this.databaseService.saveSession(session);
        this.databaseService.saveCustomer(customer);

        return {
            botResponse,
            analysis,
            customer,
            session,
            activeNodeId,
        };
    }

    private findNode(flow: FlowDefinition, nodeId: string): FlowNode | undefined {
        return flow.nodes.find((n) => n.id === nodeId);
    }

    private extractPhoneOrCpf(text: string): string | null {
        const phoneOrIdPattern = /\b(?:\d{10,13}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/;
        const match = text.match(phoneOrIdPattern);

        if (!match) {
            return null;
        }

        return match[0];
    }

    private extractAddressFromText(text: string): string | null {
        const addressRegex =
            /(?:rua|avenida|av\.?|alameda|travessa|rodovia|praça)\s+[^,\n]+(?:\s*,\s*\d+)?(?:\s*-\s*[^,\n]+)?/i;
        const match = text.match(addressRegex);

        if (match) {
            return match[0].trim();
        }

        const genericTargetMatch = text.match(/(?:para|pra|novo endereço:?)\s+([a-záàâãéèêíïóôõöúçñ0-9\s,.-]+)/i);

        if (genericTargetMatch && genericTargetMatch[1].trim().length > 3) {
            return genericTargetMatch[1].trim();
        }

        return null;
    }
}
