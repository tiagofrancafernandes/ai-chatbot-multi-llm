import { Injectable, Logger } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { LlmService } from '../llm/llm.service';
import { Customer } from '../common/interfaces/customer.interface';
import { ChatSession, ChatMessage } from '../common/interfaces/chat.interface';
import { IntentAnalysisResult, IntentContext } from '../llm/interfaces/llm-provider.interface';
import { FlowDefinition, FlowNode } from '../common/interfaces/flow.interface';
import { Contract, CustomerRegistrationData } from '../common/interfaces/contract.interface';

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

        // Step 2: Handle Pending Action (Subscription data entry, contract signing, confirmations)
        if (session.pendingAction) {
            const pendingOutcome = this.handlePendingAction(text, analysis, session, customer);

            if (pendingOutcome) {
                return this.finalizeStep(
                    pendingOutcome.response,
                    analysis,
                    pendingOutcome.updatedCustomer || customer,
                    session,
                    pendingOutcome.nodeId,
                    pendingOutcome.options
                );
            }
        }

        // Step 3: Identification & Authentication Guard for Guest Customers
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

    private handlePendingAction(
        text: string,
        analysis: IntentAnalysisResult,
        session: ChatSession,
        customer: Customer
    ): StepRoutingOutcome | null {
        const pending = session.pendingAction;

        if (!pending) {
            return null;
        }

        if (pending.type === 'new_subscription') {
            return this.handleNewSubscriptionData(text, analysis, session, customer);
        }

        if (pending.type === 'contract_signing') {
            return this.handleContractSigning(text, analysis, session, customer);
        }

        return this.handlePendingConfirmation(text, analysis, session, customer);
    }

    private handleNewSubscriptionData(
        text: string,
        analysis: IntentAnalysisResult,
        session: ChatSession,
        customer: Customer
    ): StepRoutingOutcome | null {
        const pending = session.pendingAction;

        if (!pending || pending.type !== 'new_subscription') {
            return null;
        }

        const currentData = pending.registrationData || {};
        const lowerText = text.toLowerCase();

        if (lowerText.includes('pro') || lowerText.includes('professional')) {
            pending.targetPlan = 'Professional';
        }

        if (lowerText.includes('premium') || lowerText.includes('business')) {
            pending.targetPlan = 'Premium Business';
        }

        if (lowerText.includes('starter') || lowerText.includes('barato')) {
            pending.targetPlan = 'Starter';
        }

        const updatedData = this.extractRegistrationFields(text, currentData);
        pending.registrationData = updatedData;

        const hasAnyRegistrationField =
            Boolean(updatedData.name && updatedData.name !== currentData.name) ||
            Boolean(updatedData.cpf && updatedData.cpf !== currentData.cpf) ||
            Boolean(updatedData.email && updatedData.email !== currentData.email) ||
            Boolean(updatedData.phone && updatedData.phone !== currentData.phone) ||
            Boolean(updatedData.address && updatedData.address !== currentData.address);

        const isCancel = !hasAnyRegistrationField && this.isNegativeConfirmation(text, analysis);

        if (isCancel) {
            session.pendingAction = null;

            return {
                response:
                    'Contratação cancelada conforme solicitado. Nenhum dado foi salvo e nenhuma cobrança será gerada.\n\nComo mais posso te ajudar?',
                nodeId: 'node_subscription_cancelled',
                options: ['Ver planos disponíveis', 'Falar com atendente'],
                updatedCustomer: customer,
            };
        }

        const missing = this.getMissingRegistrationFields(updatedData);

        if (missing.length > 0) {
            const targetPlan = pending.targetPlan || 'Starter';
            const collectedList: string[] = [];

            if (updatedData.name) {
                collectedList.push(`• Nome: **${updatedData.name}**`);
            }
            if (updatedData.cpf) {
                collectedList.push(`• CPF: **${updatedData.cpf}**`);
            }
            if (updatedData.email) {
                collectedList.push(`• E-mail: **${updatedData.email}**`);
            }
            if (updatedData.phone) {
                collectedList.push(`• Telefone: **${updatedData.phone}**`);
            }
            if (updatedData.address) {
                collectedList.push(`• Endereço: **${updatedData.address}**`);
            }

            const collectedText =
                collectedList.length > 0 ? `Perfeito! Já registramos:\n${collectedList.join('\n')}\n\n` : '';

            const missingListText = missing.map((f) => `• **${f}**`).join('\n');

            const response = `${collectedText}Para emitirmos seu contrato digital do plano **${targetPlan}**, ainda precisamos dos seguintes dados:\n${missingListText}\n\n*(Você pode enviar os dados restantes juntos ou um por um!)*`;

            const options = this.buildRegistrationOptions(missing);

            return {
                response,
                nodeId: 'node_customer_registration_action',
                options,
                updatedCustomer: customer,
            };
        }

        // All required fields present! Issue digital contract
        const targetPlan = pending.targetPlan || 'Starter';
        const plans = this.databaseService.getPlans();
        const matchedPlan = plans.find((p) => p.name.toLowerCase() === targetPlan.toLowerCase()) || plans[0];

        const contractId = `CONT-${Math.floor(100000 + Math.random() * 900000)}`;
        const signatureUrl = `https://assinatura.empresa.com.br/contrato/${contractId}`;

        const contract: Contract = {
            id: contractId,
            customerId: updatedData.phone || customer.id,
            type: 'new_subscription',
            planName: matchedPlan.name,
            monthlyPrice: matchedPlan.price,
            status: 'pending_signature',
            signatureUrl,
            customerData: updatedData,
            createdAt: Date.now(),
        };

        this.databaseService.saveContract(contract);

        session.pendingAction = {
            type: 'contract_signing',
            contractId: contract.id,
            targetPlan: matchedPlan.name,
            contractUrl: signatureUrl,
            registrationData: updatedData,
            description: `Assinatura de contrato digital para ${matchedPlan.name}`,
            createdAt: Date.now(),
        };

        const response = `🎉 **Dados cadastrais validados com sucesso!**\n\nEmitimos o seu contrato digital para o plano **${matchedPlan.name}** (**R$ ${matchedPlan.price.toFixed(2)}/mês**):\n\n📄 **Contrato Nº:** \`${contract.id}\`\n👤 **Titular:** ${updatedData.name} (CPF: ${updatedData.cpf})\n📍 **Instalação:** ${updatedData.address}\n\n🔗 **Link Seguro para Assinatura:**\n[Clique aqui para Assinar o Contrato Digital](${contract.signatureUrl})\n\nApós assinar no link acima, me avise aqui digitando **'já assinei'** para ativarmos sua conexão!`;

        const options = ['Já assinei o contrato', 'Simular assinatura do contrato', 'Cancelar contratação'];

        return {
            response,
            nodeId: 'node_contract_issued',
            options,
            updatedCustomer: customer,
        };
    }

    private handleContractSigning(
        text: string,
        analysis: IntentAnalysisResult,
        session: ChatSession,
        customer: Customer
    ): StepRoutingOutcome | null {
        const pending = session.pendingAction;

        if (!pending || pending.type !== 'contract_signing' || !pending.contractId) {
            return null;
        }

        const lower = text.toLowerCase().trim();

        // 1. Signature simulation or signature claim MUST be evaluated first
        const isSimulate =
            analysis.primaryIntent === 'simulate_signature' ||
            lower.includes('simular assinatura') ||
            lower.includes('simular contrato') ||
            lower.includes('simular');

        if (isSimulate) {
            this.databaseService.signContract(pending.contractId);
        }

        const isSignedClaim =
            isSimulate ||
            analysis.primaryIntent === 'contract_signed' ||
            lower.includes('assinei') ||
            lower.includes('assinado') ||
            lower.includes('já assinei') ||
            lower.includes('ja assinei') ||
            lower.includes('acabei de assinar');

        if (!isSignedClaim) {
            const isCancel = this.isNegativeConfirmation(text, analysis);

            if (isCancel) {
                const contract = this.databaseService.findContractById(pending.contractId);

                if (contract) {
                    contract.status = 'cancelled';
                    this.databaseService.saveContract(contract);
                }

                session.pendingAction = null;

                return {
                    response:
                        'A formalização do contrato foi cancelada conforme solicitado.\n\nComo mais posso te ajudar?',
                    nodeId: 'node_contract_cancelled',
                    options: ['Ver planos disponíveis', 'Falar com atendente', 'Menu principal'],
                    updatedCustomer: customer,
                };
            }

            return {
                response: `Estamos aguardando a assinatura digital do seu contrato:\n\n📄 **Contrato Nº:** \`${pending.contractId}\`\n🔗 **Link:** [Assinar Contrato Digital](${pending.contractUrl})\n\nAssim que assinar, digite **'já assinei'**! Ou clique em 'Simular assinatura do contrato' para testar.`,
                nodeId: 'node_contract_verification',
                options: ['Já assinei o contrato', 'Simular assinatura do contrato', 'Cancelar contratação'],
                updatedCustomer: customer,
            };
        }

        // Verify contract signature in database
        const contract = this.databaseService.findContractById(pending.contractId);

        if (!contract || contract.status !== 'signed') {
            return {
                response: `🔍 Verificamos no sistema de assinaturas e o contrato **${pending.contractId}** ainda consta como **Pendente de Assinatura**.\n\nPor favor, complete a assinatura através do link:\n🔗 [Assinar Contrato Digital](${pending.contractUrl})\n\n*(Dica de teste: você pode clicar no botão 'Simular assinatura do contrato' abaixo para testar a ativação imediata)*`,
                nodeId: 'node_contract_verification',
                options: ['Simular assinatura do contrato', 'Já assinei agora', 'Cancelar contratação'],
                updatedCustomer: customer,
            };
        }

        // Contract is SIGNED!
        if (contract.type === 'new_subscription') {
            const regData = pending.registrationData || contract.customerData || {};
            const customerId = regData.phone || customer.id;

            const newCustomer: Customer = {
                id: customerId,
                name: regData.name || 'Novo Cliente',
                email: regData.email || '',
                phone: regData.phone || customerId,
                cpfCnpj: regData.cpf,
                plan: contract.planName,
                isIdentified: true,
                invoices: [
                    {
                        id: `INV-${Date.now().toString().slice(-4)}`,
                        amount: contract.monthlyPrice,
                        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
                        status: 'pending',
                    },
                ],
                metadata: {
                    cpf: regData.cpf,
                    address: regData.address,
                    contractId: contract.id,
                    signedAt: contract.signedAt || Date.now(),
                },
            };

            this.databaseService.saveCustomer(newCustomer);
            session.customerId = newCustomer.id;
            session.pendingAction = null;

            const response = `✅ **Contrato assinado e confirmado com sucesso!**\n\nIdentificamos a validação digital do contrato **${contract.id}** via Certificado Digital ICP-Brasil.\n\n🎉 Parabéns, **${newCustomer.name}**! Seu plano **${contract.planName}** (R$ ${contract.monthlyPrice.toFixed(2)}/mês) está oficialmente contratado e ativo. Bem-vindo(a) à nossa rede!\n\nSeu acesso foi liberado. Como posso te ajudar agora?`;
            const options = ['Qual é o meu plano atual?', 'Ver minhas faturas', 'Suporte técnico'];

            return {
                response,
                nodeId: 'node_subscription_success',
                options,
                updatedCustomer: newCustomer,
            };
        }

        if (contract.type === 'plan_change') {
            const oldPlan = pending.previousValue || customer.plan || 'Anterior';
            customer.plan = contract.planName;

            if (!customer.metadata) {
                customer.metadata = {};
            }
            customer.metadata.contractId = contract.id;
            customer.metadata.planChangedAt = contract.signedAt || Date.now();

            this.databaseService.saveCustomer(customer);
            session.pendingAction = null;

            const response = `✅ **Termo Aditivo assinado e confirmado com sucesso!**\n\nIdentificamos a validação digital do termo **${contract.id}**.\n\nSeu plano foi atualizado de "${oldPlan}" para o **"${contract.planName}"**.\nAs novas condições e valores já estão valendo para sua conta!`;
            const options = ['Qual é o meu plano atual?', 'Ver minhas faturas', 'Menu principal'];

            return {
                response,
                nodeId: 'node_plan_change_success',
                options,
                updatedCustomer: customer,
            };
        }

        return null;
    }

    private extractRegistrationFields(text: string, existing: CustomerRegistrationData = {}): CustomerRegistrationData {
        const result: CustomerRegistrationData = { ...existing };

        // 1. Extract CPF
        if (!result.cpf) {
            const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
            const cpfMatch = text.match(cpfRegex);

            if (cpfMatch) {
                result.cpf = cpfMatch[0].trim();
            }
        }

        // 2. Extract Email
        if (!result.email) {
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
            const emailMatch = text.match(emailRegex);

            if (emailMatch) {
                result.email = emailMatch[0].trim();
            }
        }

        // 3. Extract Phone
        if (!result.phone) {
            const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/;
            const phoneMatch = text.match(phoneRegex);

            if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) {
                result.phone = phoneMatch[0].replace(/\D/g, '');
            }
        }

        // 4. Extract Address
        if (!result.address) {
            const addressRegex =
                /(?:rua|avenida|av\.?|alameda|travessa|rodovia|praça)\s+[^,\n]+(?:\s*,\s*\d+)?(?:\s*-\s*[^,\n]+)?/i;
            const addressMatch = text.match(addressRegex);

            if (addressMatch) {
                result.address = addressMatch[0].trim();
            }

            if (!result.address) {
                const genericAddr = text.match(/(?:endereço|endereco):?\s*([^,\n]+(?:,\s*\d+)?)/i);

                if (genericAddr) {
                    result.address = genericAddr[1].trim();
                }
            }
        }

        // 5. Extract Name
        if (!result.name) {
            const explicitNameMatch = text.match(/(?:nome|meu nome é|chamo-me|sou o|sou a):?\s*([A-Za-zÀ-ÿ\s]{3,40})/i);

            if (explicitNameMatch) {
                let cleanName = explicitNameMatch[1].trim();

                cleanName = cleanName
                    .replace(
                        /\s+(?:e\s+)?(?:meu|minha|telefone|celular|whats|whatsapp|cpf|email|endereço|endereco|rua).*$/i,
                        ''
                    )
                    .trim();

                if (cleanName.length >= 2) {
                    result.name = cleanName;
                }
            }

            if (!result.name && text.includes(',')) {
                const firstPart = text.split(',')[0].trim();

                if (
                    firstPart.split(/\s+/).length >= 2 &&
                    !firstPart.includes('@') &&
                    !/\d/.test(firstPart) &&
                    !/^(rua|av|plano|quero|meu|minha)/i.test(firstPart)
                ) {
                    result.name = firstPart;
                }
            }

            if (!result.name) {
                const words = text.trim().split(/\s+/);

                if (
                    words.length >= 2 &&
                    words.length <= 4 &&
                    !text.includes('@') &&
                    !/\d/.test(text) &&
                    !/^(sim|não|nao|ola|oi|quero|bom dia|boa tarde|assinar|cancelar)/i.test(text)
                ) {
                    result.name = text.trim();
                }
            }
        }

        return result;
    }

    private getMissingRegistrationFields(data: CustomerRegistrationData): string[] {
        const missing: string[] = [];

        if (!data.name) {
            missing.push('Nome completo');
        }

        if (!data.cpf) {
            missing.push('CPF');
        }

        if (!data.email) {
            missing.push('E-mail');
        }

        if (!data.phone) {
            missing.push('Telefone / WhatsApp');
        }

        if (!data.address) {
            missing.push('Endereço completo de instalação');
        }

        return missing;
    }

    private buildRegistrationOptions(missing: string[]): string[] {
        const options: string[] = [];

        if (missing.includes('Nome completo') && missing.includes('CPF')) {
            options.push('Meu nome é Carlos Silva, CPF 123.456.789-00');
        }

        if (missing.includes('E-mail') && missing.includes('Telefone / WhatsApp')) {
            options.push('carlos@example.com, tel 5511988887777');
        }

        if (missing.includes('Endereço completo de instalação')) {
            options.push('Rua das Flores, 120 - São Paulo');
        }

        options.push('Cancelar contratação');

        return options;
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
                const plans = this.databaseService.getPlans();
                const matchedPlan = plans.find((p) => p.name.toLowerCase() === newPlan.toLowerCase()) || plans[0];

                const contractId = `CONT-MOD-${Math.floor(100000 + Math.random() * 900000)}`;
                const signatureUrl = `https://assinatura.empresa.com.br/contrato/${contractId}`;

                const contract: Contract = {
                    id: contractId,
                    customerId: customer.id,
                    type: 'plan_change',
                    planName: newPlan,
                    monthlyPrice: matchedPlan.price,
                    status: 'pending_signature',
                    signatureUrl,
                    createdAt: Date.now(),
                };

                this.databaseService.saveContract(contract);

                session.pendingAction = {
                    type: 'contract_signing',
                    contractId: contract.id,
                    targetPlan: newPlan,
                    previousValue: oldPlan,
                    contractUrl: signatureUrl,
                    description: `Termo Aditivo de alteração para o plano ${newPlan}`,
                    createdAt: Date.now(),
                };

                const response = `📄 **Termo Aditivo de Alteração de Plano Gerado!**\n\nPara formalizarmos a alteração do seu plano de "${oldPlan}" para o **"${newPlan}"** (R$ ${matchedPlan.price.toFixed(2)}/mês), acesse o link seguro para assinatura digital:\n\n🔗 **Link Seguro:** [Clique aqui para Assinar o Termo Aditivo](${contract.signatureUrl})\n\nAssim que concluir a assinatura digital, me avise aqui digitando **'já assinei'** para ativarmos o novo plano!`;
                const options = [
                    'Já assinei o contrato',
                    'Simular assinatura do contrato',
                    'Não, manter meu plano atual',
                ];

                return {
                    response,
                    nodeId: 'node_plan_contract_action',
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
        const lower = text.toLowerCase().trim();

        // Safeguard: signature simulation, signing claims or registration keywords are NEVER negative confirmation
        if (
            lower.includes('simular') ||
            lower.includes('assinei') ||
            lower.includes('assinado') ||
            lower.includes('assinatura') ||
            lower.includes('contratar') ||
            lower.includes('cadastrar')
        ) {
            return false;
        }

        if (analysis.primaryIntent === 'confirmation_no') {
            return true;
        }

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
        const lowerText = text.toLowerCase();
        const candidateIdentifier = analysis.extractedIdentifier || this.extractPhoneOrCpf(text);

        const isRegistration =
            analysis.primaryIntent === 'customer_registration' ||
            lowerText.includes('registrar') ||
            lowerText.includes('registro') ||
            lowerText.includes('cadastrar') ||
            lowerText.includes('cadastro') ||
            lowerText.includes('criar conta') ||
            lowerText.includes('abrir conta') ||
            lowerText.includes('novo cliente') ||
            lowerText.includes('novo cadastro');

        const isSubscription =
            analysis.primaryIntent === 'plan_subscription' ||
            lowerText.includes('assinar') ||
            lowerText.includes('contratar') ||
            lowerText.includes('quero o plano') ||
            lowerText.includes('vou querer o plano') ||
            lowerText.includes('escolho o plano') ||
            lowerText.includes('plano starter') ||
            lowerText.includes('plano pro') ||
            lowerText.includes('plano professional') ||
            lowerText.includes('plano premium') ||
            lowerText.includes('plano business');

        const registrationNode = this.findNode(flow, 'node_customer_registration_action');
        const regNodeId = registrationNode?.id || 'node_customer_registration_action';

        // 1. Explicit Customer Registration Flow
        if (isRegistration && !lowerText.includes('mudar') && !lowerText.includes('trocar')) {
            const plans = this.databaseService.getPlans();
            let chosenPlan = plans[0]; // Starter default

            if (lowerText.includes('pro') || lowerText.includes('professional')) {
                const found = plans.find((p) => p.name === 'Professional');
                if (found) {
                    chosenPlan = found;
                }
            }

            if (lowerText.includes('premium') || lowerText.includes('business')) {
                const found = plans.find((p) => p.name === 'Premium Business');
                if (found) {
                    chosenPlan = found;
                }
            }

            const initialData = this.extractRegistrationFields(text, {});
            session.pendingAction = {
                type: 'new_subscription',
                targetPlan: chosenPlan.name,
                registrationData: initialData,
                description: `Cadastro de cliente e contratação do plano ${chosenPlan.name}`,
                createdAt: Date.now(),
            };

            const missing = this.getMissingRegistrationFields(initialData);

            if (missing.length < 5) {
                const outcome = this.handleNewSubscriptionData(text, analysis, session, currentCustomer);

                if (outcome) {
                    return {
                        isHandled: true,
                        response: outcome.response,
                        nodeId: outcome.nodeId,
                        updatedCustomer: outcome.updatedCustomer || currentCustomer,
                        options: outcome.options,
                    };
                }
            }

            const planLines = plans.map(
                (p) => `• **${p.name}**: R$ ${p.price.toFixed(2)}/mês (${p.features.join(', ')})`
            );

            const response =
                `Seja muito bem-vindo! Ficamos felizes com seu interesse em se tornar nosso cliente.\n\n` +
                `Aqui estão nossos planos de assinatura disponíveis:\n\n${planLines.join('\n')}\n\n` +
                `Qual destes planos você gostaria de contratar para iniciarmos seu cadastro?\n\n` +
                `*(Se preferir, você também já pode nos enviar seus dados: Nome completo, CPF, E-mail, Telefone com DDD e Endereço completo de instalação!)*`;

            const options = ['Quero o plano Starter', 'Quero o plano Professional', 'Quero o plano Premium Business'];

            return {
                isHandled: true,
                response,
                nodeId: regNodeId,
                updatedCustomer: currentCustomer,
                options,
            };
        }

        // 2. Plan Subscription Flow
        if (isSubscription && !lowerText.includes('mudar') && !lowerText.includes('trocar')) {
            const plans = this.databaseService.getPlans();
            const hasSpecificPlan =
                lowerText.includes('pro') ||
                lowerText.includes('professional') ||
                lowerText.includes('premium') ||
                lowerText.includes('business') ||
                lowerText.includes('starter') ||
                lowerText.includes('barato') ||
                lowerText.includes('49') ||
                lowerText.includes('99') ||
                lowerText.includes('150');

            if (!hasSpecificPlan) {
                const planLines = plans.map(
                    (p) => `• **${p.name}**: R$ ${p.price.toFixed(2)}/mês (${p.features.join(', ')})`
                );

                const response =
                    `Excelente! Ficamos felizes com seu interesse em assinar nossos serviços.\n\n` +
                    `Aqui estão nossos planos disponíveis para contratação:\n\n${planLines.join('\n')}\n\n` +
                    `Qual destes planos você gostaria de contratar para iniciarmos seu cadastro?`;

                const options = [
                    'Quero o plano Starter',
                    'Quero o plano Professional',
                    'Quero o plano Premium Business',
                ];

                session.pendingAction = {
                    type: 'new_subscription',
                    targetPlan: 'Starter',
                    registrationData: {},
                    description: 'Contratação de assinatura',
                    createdAt: Date.now(),
                };

                return {
                    isHandled: true,
                    response,
                    nodeId: regNodeId,
                    updatedCustomer: currentCustomer,
                    options,
                };
            }

            let chosenPlan = plans[0]; // Starter default

            if (lowerText.includes('pro') || lowerText.includes('professional')) {
                const found = plans.find((p) => p.name === 'Professional');
                if (found) {
                    chosenPlan = found;
                }
            }

            if (lowerText.includes('premium') || lowerText.includes('business')) {
                const found = plans.find((p) => p.name === 'Premium Business');
                if (found) {
                    chosenPlan = found;
                }
            }

            if (lowerText.includes('starter') || lowerText.includes('barato') || lowerText.includes('49')) {
                const found = plans.find((p) => p.name === 'Starter');
                if (found) {
                    chosenPlan = found;
                }
            }

            session.pendingAction = {
                type: 'new_subscription',
                targetPlan: chosenPlan.name,
                registrationData: this.extractRegistrationFields(text, {}),
                description: `Contratação do plano ${chosenPlan.name}`,
                createdAt: Date.now(),
            };

            const missing = this.getMissingRegistrationFields(session.pendingAction.registrationData || {});

            if (missing.length < 5) {
                const outcome = this.handleNewSubscriptionData(text, analysis, session, currentCustomer);

                if (outcome) {
                    return {
                        isHandled: true,
                        response: outcome.response,
                        nodeId: outcome.nodeId,
                        updatedCustomer: outcome.updatedCustomer || currentCustomer,
                        options: outcome.options,
                    };
                }
            }

            const response = `Excelente escolha! O plano **${chosenPlan.name}** (**R$ ${chosenPlan.price.toFixed(2)}/mês**) oferece ${chosenPlan.features.join(', ')}.\n\nPara gerarmos seu contrato digital e ativarmos sua conexão, precisamos dos seus dados cadastrais:\n• **Nome completo**\n• **CPF**\n• **E-mail**\n• **Telefone com DDD**\n• **Endereço completo de instalação**\n\n*(Você pode nos enviar todos os dados juntos em uma única mensagem ou aos poucos, como preferir!)*`;

            const options = [
                'Carlos Silva, CPF 123.456.789-00, carlos@example.com, 5511988887777, Rua das Flores, 120',
                'Ver outros planos',
                'Cancelar contratação',
            ];

            return {
                isHandled: true,
                response,
                nodeId: regNodeId,
                updatedCustomer: currentCustomer,
                options,
            };
        }

        // 3. Existing Customer Candidate Identifier Authentication
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

            const response = `Não localizamos nenhum cadastro com "${candidateIdentifier}".\n\nSe você ainda não é cliente, você pode iniciar um novo cadastro para assinar nossos planos!`;
            const options = ['Quero me cadastrar', 'Ver planos disponíveis', 'Falar com atendente'];

            return {
                isHandled: true,
                response,
                nodeId: 'node_customer_auth_action',
                updatedCustomer: currentCustomer,
                options,
            };
        }

        // 4. Plan Pricing Inquiries
        if (analysis.primaryIntent === 'plan_pricing') {
            const pricingNode = this.findNode(flow, 'node_plan_pricing_action');
            const plans = this.databaseService.getPlans();
            const planLines = plans.map(
                (p) => `• **${p.name}**: R$ ${p.price.toFixed(2)}/mês (${p.features.join(', ')})`
            );
            const response = `Aqui estão nossos planos de assinatura disponíveis:\n\n${planLines.join('\n')}\n\nQual plano você gostaria de assinar? Ou, se já for cliente, informe seu telefone ou CPF para acessar sua conta!`;
            const options = [
                'Quero o plano Starter',
                'Quero o plano Professional',
                'Quero o plano Premium Business',
                'Já sou cliente (informar telefone)',
            ];

            return {
                isHandled: true,
                response,
                nodeId: pricingNode?.id || 'node_plan_pricing_action',
                updatedCustomer: currentCustomer,
                options,
            };
        }

        // 5. Greeting
        if (analysis.primaryIntent === 'greeting') {
            const response = `Olá! Seja bem-vindo ao nosso atendimento inteligente.\n\nSe você já é cliente, informe seu número de telefone ou CPF cadastrado (ex: '5511999999999') para acessar sua conta.\nSe você deseja se cadastrar ou contratar um novo plano, escolha uma das opções abaixo:`;
            const options = ['Quero me cadastrar', 'Ver planos disponíveis', 'Meu telefone é 5511999999999'];

            return {
                isHandled: true,
                response,
                nodeId: 'node_customer_auth_action',
                updatedCustomer: currentCustomer,
                options,
            };
        }

        // 6. Generic / Unknown Fallback for Guests
        const response = `Olá! Não consegui identificar sua solicitação.\n\nSe você já é cliente, por favor informe seu telefone ou CPF cadastrado (ex: '5511999999999') para acessar sua conta.\nSe deseja se cadastrar ou contratar um novo plano, basta selecionar abaixo:`;
        const options = ['Quero me cadastrar', 'Ver planos disponíveis', 'Falar com atendente'];

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
        // 1. Identify specific target plan first (e.g. Professional, Premium Business, Starter)
        let targetPlanName: string | null =
            analysis.targetPlan && analysis.targetPlan !== 'cheapest' ? analysis.targetPlan : null;

        if (!targetPlanName) {
            if (lowerText.includes('pro') || lowerText.includes('professional')) {
                targetPlanName = 'Professional';
            }
            if (lowerText.includes('premium') || lowerText.includes('business')) {
                targetPlanName = 'Premium Business';
            }
            if (lowerText.includes('starter') && !lowerText.includes('barato')) {
                targetPlanName = 'Starter';
            }
        }

        const matchedTarget = plans.find((p) => p.name.toLowerCase() === (targetPlanName || '').toLowerCase());

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

        // 2. User asked for the cheapest plan
        const sortedPlans = [...plans].sort((a, b) => a.price - b.price);
        const cheapestPlan = sortedPlans[0];

        const wantsCheapest =
            analysis.targetPlan === 'cheapest' ||
            lowerText.includes('barato') ||
            lowerText.includes('em conta') ||
            lowerText.includes('menor valor');

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
        const lower = text.toLowerCase();

        // Guard: If text explicitly talks about plans, do not extract as address
        if (lower.includes('plano') || lower.includes('assinatura') || lower.includes('fatura')) {
            return null;
        }

        const addressRegex =
            /(?:rua|avenida|av\.?|alameda|travessa|rodovia|praça)\s+[^,\n]+(?:\s*,\s*\d+)?(?:\s*-\s*[^,\n]+)?/i;
        const match = text.match(addressRegex);

        if (match) {
            return match[0].trim();
        }

        // Only generic match if explicit address indicator exists
        if (lower.includes('endereço') || lower.includes('endereco') || lower.includes('mudei de casa')) {
            const genericTargetMatch = text.match(
                /(?:para|pra|novo endereço:?|novo endereco:?)\s+([a-záàâãéèêíïóôõöúçñ0-9\s,.-]+)/i
            );

            if (genericTargetMatch && genericTargetMatch[1].trim().length > 3) {
                return genericTargetMatch[1].trim();
            }
        }

        return null;
    }
}
