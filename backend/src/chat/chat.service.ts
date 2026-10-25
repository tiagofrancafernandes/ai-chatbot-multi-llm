import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { FlowEngineService } from '../flow/flow-engine.service';
import { LlmService } from '../llm/llm.service';
import { InitChatDto } from './dto/init-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TransferAttendanceDto } from './dto/transfer-attendance.dto';
import { AgentMessageDto } from './dto/agent-message.dto';
import { ResumeAiDto } from './dto/resume-ai.dto';
import { OperatorActionDto } from './dto/operator-action.dto';
import { Customer } from '../common/interfaces/customer.interface';
import { ChatSession, ChatMessage } from '../common/interfaces/chat.interface';
import { AttendanceInfo, HumanAgent, AttendanceDepartment } from '../common/interfaces/attendance.interface';

@Injectable()
export class ChatService {
    constructor(
        private readonly databaseService: JsonDatabaseService,
        private readonly flowEngineService: FlowEngineService,
        private readonly llmService: LlmService
    ) {}

    public async initChat(dto: InitChatDto): Promise<{
        session: ChatSession;
        customer: Customer;
        activeProvider: string;
        activeModel: string;
    }> {
        const rawCustomerId = dto.customerId?.trim();
        const customerId = rawCustomerId ? rawCustomerId : `guest_${Date.now()}`;

        let customer = this.databaseService.findCustomerById(customerId);

        if (!customer) {
            customer = {
                id: customerId,
                invoices: [],
                isIdentified: false,
            };
            this.databaseService.saveCustomer(customer);
        }

        let session = this.databaseService.findSessionByCustomerId(customerId);

        if (!session) {
            const initialGreeting: ChatMessage = {
                id: `msg_init_${Date.now()}`,
                sender: 'bot',
                text: 'Olá! Seja muito bem-vindo ao nosso atendimento inteligente. Como podemos te ajudar hoje?',
                timestamp: Date.now(),
                nodeId: 'node_intent_decision',
            };

            session = {
                id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                customerId: customer.id,
                messages: [initialGreeting],
                activeNodeId: 'node_intent_decision',
                attendance: {
                    mode: 'ai',
                    assignedTo: {
                        type: 'ai',
                        name: 'SystemOne AI',
                    },
                    timeoutSeconds: 60,
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            this.databaseService.saveSession(session);
        }

        this.ensureSessionAttendance(session);

        const activeProvider = this.llmService.getActiveProviderId();
        const activeModel = this.llmService.getActiveModel();

        const isOperatorScope = dto.scope === 'operator';
        const returnedSession = isOperatorScope
            ? session
            : {
                  ...session,
                  messages: session.messages.filter((m) => !m.isInternal),
              };

        return {
            session: returnedSession,
            customer,
            activeProvider,
            activeModel,
        };
    }

    public async sendMessage(dto: SendMessageDto): Promise<{
        session: ChatSession;
        customer: Customer;
        botResponse: string;
        analysis: unknown;
    }> {
        if (!dto.customerId) {
            throw new BadRequestException('customerId is required');
        }

        if (!dto.text || !dto.text.trim()) {
            throw new BadRequestException('Message text is required');
        }

        let customer = this.databaseService.findCustomerById(dto.customerId);

        if (!customer) {
            customer = {
                id: dto.customerId,
                invoices: [],
                isIdentified: false,
            };
            this.databaseService.saveCustomer(customer);
        }

        let session = this.databaseService.findSessionByCustomerId(dto.customerId);

        if (!session) {
            session = {
                id: `sess_${Date.now()}`,
                customerId: customer.id,
                messages: [],
                activeNodeId: 'node_intent_decision',
                attendance: {
                    mode: 'ai',
                    assignedTo: {
                        type: 'ai',
                        name: 'SystemOne AI',
                    },
                    timeoutSeconds: 60,
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            this.databaseService.saveSession(session);
        }

        this.ensureSessionAttendance(session);

        const attendance = session.attendance as AttendanceInfo;

        // Check if session is currently transferred to Human Queue or Human Agent
        if (attendance.mode === 'human_queued' || attendance.mode === 'human_active') {
            const now = Date.now();
            const lastInteraction = attendance.lastAgentInteractionAt || attendance.pausedAt || session.updatedAt;
            const elapsedSeconds = Math.floor((now - lastInteraction) / 1000);
            const timeoutLimit =
                attendance.timeoutSeconds && attendance.timeoutSeconds > 0 ? attendance.timeoutSeconds : 60;

            // INACTIVITY TIMEOUT TRIGGERED: Automatically resume AI attendance!
            if (elapsedSeconds >= timeoutLimit) {
                attendance.mode = 'ai';
                attendance.assignedTo = {
                    type: 'ai',
                    name: 'SystemOne AI',
                };
                attendance.queue = undefined;

                const resumeNotice: ChatMessage = {
                    id: `msg_auto_resume_${Date.now()}`,
                    sender: 'system',
                    text: `⏰ **Atendimento automatizado retomado por inatividade:**\nComo não houve interação de um atendente humano nos últimos ${elapsedSeconds} segundos, a IA reassumiu o seu atendimento para que você não precise aguardar!`,
                    timestamp: Date.now(),
                };
                session.messages.push(resumeNotice);

                const userMessage: ChatMessage = {
                    id: `msg_user_${Date.now()}`,
                    sender: 'user',
                    text: dto.text.trim(),
                    timestamp: Date.now(),
                };
                session.messages.push(userMessage);

                const flowResult = await this.flowEngineService.processMessage({
                    text: dto.text,
                    session,
                    customer,
                    providerId: dto.providerId,
                    modelOverride: dto.model,
                });

                return {
                    session: flowResult.session,
                    customer: flowResult.customer,
                    botResponse: flowResult.botResponse,
                    analysis: flowResult.analysis,
                };
            }

            // HUMAN AGENT IS ACTIVE / IN QUEUE AND WITHIN TIMEOUT: AI IS PAUSED!
            const userMessage: ChatMessage = {
                id: `msg_user_${Date.now()}`,
                sender: 'user',
                text: dto.text.trim(),
                timestamp: Date.now(),
            };
            session.messages.push(userMessage);

            attendance.lastCustomerInteractionAt = now;
            session.updatedAt = now;
            this.databaseService.saveSession(session);

            const assignedName = attendance.assignedTo.name;
            const waitNotice =
                attendance.mode === 'human_queued'
                    ? `Sua mensagem foi enviada para a fila de **${assignedName}** (Posição: ${attendance.queue?.position || 1}). O atendimento automatizado por IA está pausado.`
                    : `Sua mensagem foi entregue para o atendente **${assignedName}**. O atendimento automatizado por IA está pausado.`;

            const isOperatorScope = dto.scope === 'operator';
            const returnedSession = isOperatorScope
                ? session
                : {
                      ...session,
                      messages: session.messages.filter((m) => !m.isInternal),
                  };

            return {
                session: returnedSession,
                customer,
                botResponse: waitNotice,
                analysis: {
                    primaryIntent: 'human_queued',
                    secondaryRequest: 'none',
                    isClientExplicit: true,
                    confidence: 1.0,
                    providerUsed: 'human_desk',
                    modelUsed: 'paused_ai',
                },
            };
        }

        // Standard AI-Assisted Message Processing
        const userMessage: ChatMessage = {
            id: `msg_user_${Date.now()}`,
            sender: 'user',
            text: dto.text.trim(),
            timestamp: Date.now(),
        };

        session.messages.push(userMessage);

        const flowResult = await this.flowEngineService.processMessage({
            text: dto.text,
            session,
            customer,
            providerId: dto.providerId,
            modelOverride: dto.model,
        });

        const isOperatorScope = dto.scope === 'operator';
        const returnedSession = isOperatorScope
            ? flowResult.session
            : {
                  ...flowResult.session,
                  messages: flowResult.session.messages.filter((m) => !m.isInternal),
              };

        return {
            session: returnedSession,
            customer: flowResult.customer,
            botResponse: flowResult.botResponse,
            analysis: flowResult.analysis,
        };
    }

    public transferAttendance(dto: TransferAttendanceDto): {
        session: ChatSession;
        message: string;
    } {
        const session = this.databaseService.findSessionByCustomerId(dto.customerId);
        if (!session) {
            throw new NotFoundException(`No chat session found for customerId: ${dto.customerId}`);
        }

        this.ensureSessionAttendance(session);

        const timeout = dto.timeoutSeconds && dto.timeoutSeconds > 0 ? dto.timeoutSeconds : 60;
        const now = Date.now();

        // 1. Transfer to specific agent if specified
        if (dto.agentId) {
            const agent = this.databaseService.findAgentById(dto.agentId);
            const agentName = agent?.name || 'Atendente Humano';
            const deptName = agent?.departmentName || 'Atendimento Geral';

            session.attendance = {
                mode: agent?.isOnline ? 'human_active' : 'human_queued',
                assignedTo: {
                    type: 'agent',
                    id: dto.agentId,
                    name: agentName,
                    department: deptName,
                    avatar: agent?.avatar,
                },
                pausedAt: now,
                timeoutSeconds: timeout,
                lastAgentInteractionAt: now,
                lastCustomerInteractionAt: now,
            };

            const systemMsg: ChatMessage = {
                id: `msg_sys_transfer_${now}`,
                sender: 'system',
                text: `🔄 **Transferência Realizada:**\nVocê foi direcionado para **${agentName}** (${deptName}).\nO atendimento automático por IA foi **pausado**. Se não houver interação em ${timeout}s, a IA reassumirá automaticamente.`,
                timestamp: now,
            };
            session.messages.push(systemMsg);
            session.updatedAt = now;
            this.databaseService.saveSession(session);

            return {
                session,
                message: `Atendimento transferido para ${agentName}`,
            };
        }

        // 2. Transfer to department queue
        const deptId = dto.departmentId || 'dept_suporte';
        const dept = this.databaseService.findDepartmentById(deptId);
        const deptName = dept?.name || 'Suporte Técnico';

        session.attendance = {
            mode: 'human_queued',
            assignedTo: {
                type: 'queue',
                id: deptId,
                name: `Fila: ${deptName}`,
                department: deptName,
            },
            queue: {
                department: deptId,
                departmentName: deptName,
                position: 1,
                estimatedWaitSeconds: dept?.estimatedWaitSeconds || 30,
                enteredAt: now,
            },
            pausedAt: now,
            timeoutSeconds: timeout,
            lastAgentInteractionAt: now,
            lastCustomerInteractionAt: now,
        };

        const systemMsg: ChatMessage = {
            id: `msg_sys_transfer_${now}`,
            sender: 'system',
            text: `⏳ **Você entrou na fila:**\nSetor: **${deptName}**\nPosição atual: **1º lugar** (Tempo estimado: ~${dept?.estimatedWaitSeconds || 30}s).\nO atendimento por IA está **pausado**. Aguarde um operador ou clique em 'Retomar com IA' a qualquer momento.`,
            timestamp: now,
        };
        session.messages.push(systemMsg);
        session.updatedAt = now;
        this.databaseService.saveSession(session);

        return {
            session,
            message: `Atendimento colocado na fila de ${deptName}`,
        };
    }

    public sendAgentMessage(dto: AgentMessageDto): {
        session: ChatSession;
        message: ChatMessage;
    } {
        const session = this.databaseService.findSessionByCustomerId(dto.customerId);
        if (!session) {
            throw new NotFoundException(`No chat session found for customerId: ${dto.customerId}`);
        }

        this.ensureSessionAttendance(session);

        const now = Date.now();
        const agentName = dto.agentName || session.attendance?.assignedTo.name || 'Atendente Humano';

        session.attendance = {
            mode: 'human_active',
            assignedTo: {
                type: 'agent',
                id: dto.agentId || session.attendance?.assignedTo.id,
                name: agentName,
                department: session.attendance?.assignedTo.department,
            },
            timeoutSeconds: session.attendance?.timeoutSeconds || 60,
            lastAgentInteractionAt: now,
            lastCustomerInteractionAt: session.attendance?.lastCustomerInteractionAt || now,
            pausedAt: session.attendance?.pausedAt || now,
        };

        const isInternal = Boolean(dto.isInternal);

        const agentMsg: ChatMessage = {
            id: `msg_agent_${now}`,
            sender: 'agent',
            agentName,
            text: dto.text.trim(),
            timestamp: now,
            isInternal,
            internalCategory: isInternal ? 'operator_note' : undefined,
        };

        session.messages.push(agentMsg);
        session.updatedAt = now;
        this.databaseService.saveSession(session);

        return { session, message: agentMsg };
    }

    public resumeAiAttendance(dto: ResumeAiDto): {
        session: ChatSession;
        message: string;
    } {
        const session = this.databaseService.findSessionByCustomerId(dto.customerId);
        if (!session) {
            throw new NotFoundException(`No chat session found for customerId: ${dto.customerId}`);
        }

        this.ensureSessionAttendance(session);

        const now = Date.now();
        session.attendance = {
            mode: 'ai',
            assignedTo: {
                type: 'ai',
                name: 'SystemOne AI',
            },
            timeoutSeconds: session.attendance?.timeoutSeconds || 60,
        };

        const resumeMsg: ChatMessage = {
            id: `msg_resume_${now}`,
            sender: 'system',
            text: `🤖 **Atendimento automatizado reativado:**\nA IA SystemOne reassumiu o suporte. Como posso te ajudar agora?`,
            timestamp: now,
            options: [
                'Qual é o meu plano atual?',
                'Quero mudar para o plano mais barato',
                'Ver minhas faturas',
                'Consultar cobertura',
            ],
        };

        session.messages.push(resumeMsg);
        session.updatedAt = now;
        this.databaseService.saveSession(session);

        return {
            session,
            message: 'Atendimento retomado pela IA',
        };
    }

    public getAttendanceDeskInfo(): {
        departments: AttendanceDepartment[];
        agents: HumanAgent[];
    } {
        const departments = this.databaseService.getDepartments();
        const agents = this.databaseService.getAgents();

        return { departments, agents };
    }

    private ensureSessionAttendance(session: ChatSession): void {
        if (!session.attendance) {
            session.attendance = {
                mode: 'ai',
                assignedTo: {
                    type: 'ai',
                    name: 'SystemOne AI',
                },
                timeoutSeconds: 60,
            };
        }
    }

    public getHistory(customerId: string, scope?: string): ChatSession {
        if (!customerId) {
            throw new BadRequestException('customerId query parameter is required');
        }

        const session = this.databaseService.findSessionByCustomerId(customerId);

        if (!session) {
            throw new NotFoundException(`No chat session found for customerId: ${customerId}`);
        }

        if (scope === 'operator') {
            return session;
        }

        return {
            ...session,
            messages: session.messages.filter((m) => !m.isInternal),
        };
    }

    public executeOperatorAction(dto: OperatorActionDto): {
        session: ChatSession;
        customer: Customer;
        message: string;
        actionResult: Record<string, unknown>;
    } {
        if (!dto.customerId) {
            throw new BadRequestException('customerId is required');
        }

        let customer = this.databaseService.findCustomerById(dto.customerId);
        if (!customer) {
            customer = {
                id: dto.customerId,
                invoices: [],
                isIdentified: false,
                connectionStatus: 'active',
            };
            this.databaseService.saveCustomer(customer);
        }

        let session = this.databaseService.findSessionByCustomerId(dto.customerId);
        if (!session) {
            session = {
                id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                customerId: customer.id,
                messages: [],
                activeNodeId: 'node_intent_decision',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        }

        this.ensureSessionAttendance(session);

        const now = Date.now();
        const operatorName = dto.operatorName || session.attendance?.assignedTo.name || 'Suporte Técnico';
        let actionResult: Record<string, unknown> = {};
        let internalText = '';
        let internalCategory: 'operator_note' | 'action_confirmation' | 'telemetry_status' | 'financial_summary' =
            'action_confirmation';
        let feedbackMessage = '';

        if (dto.action === 'suspend_internet') {
            customer.connectionStatus = 'suspended';
            this.databaseService.saveCustomer(customer);
            actionResult = { status: 'suspended', timestamp: now };
            feedbackMessage = 'Fornecimento de internet suspenso com sucesso';
            internalCategory = 'action_confirmation';
            internalText = `🔒 **[Ação do Atendente] Suspensão do Fornecimento de Internet**\n\n• **Status da Conexão:** 🔴 SUSPENSO administrativamente.\n• **Operador:** ${operatorName}\n• **Horário:** ${new Date(now).toLocaleTimeString('pt-BR')}\n• **Ação técnica:** Bloqueio de porta e rota aplicado no concentrador PPPoE/RADIUS.\n\n*(Esta notificação é confidencial e não é visível ao cliente).*`;
        }

        if (dto.action === 'activate_internet') {
            customer.connectionStatus = 'active';
            this.databaseService.saveCustomer(customer);
            actionResult = { status: 'active', timestamp: now };
            feedbackMessage = 'Fornecimento de internet reativado com sucesso';
            internalCategory = 'action_confirmation';
            internalText = `🔒 **[Ação do Atendente] Reativação do Fornecimento de Internet**\n\n• **Status da Conexão:** 🟢 ATIVO e liberado com sucesso.\n• **Operador:** ${operatorName}\n• **Horário:** ${new Date(now).toLocaleTimeString('pt-BR')}\n• **Provisionamento:** Rota 100% fibra operacional e autenticada na OLT.\n\n*(Esta notificação é confidencial e não é visível ao cliente).*`;
        }

        if (dto.action === 'check_signal') {
            const isSuspended = customer.connectionStatus === 'suspended';
            const signalData = {
                rxPowerDbm: -19.4,
                txPowerDbm: 2.8,
                ponStatus: isSuspended ? 'degraded' : 'operational',
                lastOnlineAt: new Date(now).toISOString(),
                onuMac: customer.opticalSignal?.onuMac || 'E4:8D:8C:3B:11:F2',
                oltPort: 'Porta PON 03 - Splitter Central Cajuru',
                attenuation: '1.2 dB (Excelente)',
                packetLoss: '0.0%',
                latencyMs: 3.8,
                uptime: '14 dias, 6 horas e 22 min',
            };
            customer.opticalSignal = {
                rxPowerDbm: signalData.rxPowerDbm,
                txPowerDbm: signalData.txPowerDbm,
                ponStatus: signalData.ponStatus as 'operational' | 'degraded' | 'offline',
                lastOnlineAt: signalData.lastOnlineAt,
                onuMac: signalData.onuMac,
            };
            this.databaseService.saveCustomer(customer);
            actionResult = signalData;
            feedbackMessage = 'Sinal óptico verificado com sucesso';
            internalCategory = 'telemetry_status';
            internalText = `📊 **[Diagnóstico Técnico Interno] Telemetria de Sinal Óptico**\n\n• **Potência RX (Recepção na ONU):** \`-19.4 dBm\` (Excelente — Faixa recomendada: -15 a -24 dBm)\n• **Potência TX (Transmissão):** \`+2.8 dBm\` (Normal)\n• **Status PON:** ${isSuspended ? '⚠️ Degradado / Bloqueado administrativamente' : '🟢 Operacional (OLT Carmo do Cajuru - Porta 3)'}\n• **MAC da ONU/Roteador:** \`${signalData.onuMac}\`\n• **Perda de Pacotes:** \`0.0%\` | **Latência Gateway:** \`3.8 ms\`\n• **Uptime da ONU:** 14 dias e 6 horas\n• **Status Conexão:** ${isSuspended ? '🔴 Suspensa' : '🟢 Ativa'}\n\n*(Telemetria técnica gerada para análise do operador antes de responder).*`;
        }

        if (dto.action === 'reboot_onu') {
            actionResult = { rebootSent: true, protocol: 'TR-069', targetMac: 'E4:8D:8C:3B:11:F2', timestamp: now };
            feedbackMessage = 'Comando de reinicialização remota enviado à ONU';
            internalCategory = 'action_confirmation';
            internalText = `⚡ **[Comando Remoto] Reinicialização de ONU / Roteador (TR-069)**\n\n• **Comando enviado:** Reboot remoto enviado com sucesso para o MAC \`E4:8D:8C:3B:11:F2\`.\n• **Tempo de convergência:** ~60 segundos para restabelecimento da sessão PPPoE.\n• **Operador responsável:** ${operatorName}\n\n*(Ação interna registrada nos logs do sistema).*`;
        }

        if (dto.action === 'view_invoices') {
            const invoices = customer.invoices || [];
            const pending = invoices.filter((i) => i.status === 'pending');
            const listStr =
                invoices.length > 0
                    ? invoices
                          .map(
                              (inv) =>
                                  `• **Fatura \`${inv.id}\`:** R$ ${inv.amount.toFixed(2)} — Venc: \`${inv.dueDate}\` [${inv.status === 'paid' ? '🟢 PAGA' : '🔴 PENDENTE'}]`
                          )
                          .join('\n')
                    : '• Nenhuma fatura registrada no banco de dados.';

            actionResult = { totalInvoices: invoices.length, pendingInvoices: pending.length };
            feedbackMessage = 'Extrato financeiro interno consultado';
            internalCategory = 'financial_summary';
            internalText = `📑 **[Extrato Financeiro Interno] Consulta de Faturas e Débitos**\n\n👤 **Titular:** **${customer.name || 'Visitante'}** (\`${customer.id}\`)\n📦 **Plano Ativo:** **${customer.plan || 'Sem plano'}**\n\n${listStr}\n\n• **Situação Cadastral:** ${pending.length === 0 ? '🟢 Em dia (Nenhuma pendência)' : `🔴 Inadimplente (${pending.length} fatura(s) pendente(s))`}\n• **Fornecimento:** ${customer.connectionStatus === 'suspended' ? '🔴 Suspenso' : '🟢 Ativo'}\n\n*(Dados confidenciais para apoio na negociação e suporte).*`;
        }

        if (dto.action === 'unlock_promise') {
            customer.connectionStatus = 'active';
            this.databaseService.saveCustomer(customer);
            actionResult = { unlocked: true, expiryHours: 48, timestamp: now };
            feedbackMessage = 'Desbloqueio em confiança de 48 horas concedido';
            internalCategory = 'action_confirmation';
            internalText = `🤝 **[Liberação em Confiança] Desbloqueio Temporário Concedido (48h)**\n\n• **Status da Conexão:** 🟢 Provisoriamente Ativo por 48 horas.\n• **Operador:** ${operatorName}\n• **Motivo:** Promessa de pagamento registrada pelo suporte.\n• **Prazo limite:** Compensação bancária até ${new Date(now + 48 * 3600 * 1000).toLocaleDateString('pt-BR')}.\n\n*(Registro interno de conformidade).*`;
        }

        if (dto.action === 'internal_note') {
            actionResult = { note: dto.noteText, timestamp: now };
            feedbackMessage = 'Nota interna adicionada com sucesso';
            internalCategory = 'operator_note';
            internalText = `📝 **[Nota Interna do Atendente]**\n\n"${dto.noteText || 'Nota registrada pelo operador.'}"\n\n👤 **Autor:** ${operatorName} às ${new Date(now).toLocaleTimeString('pt-BR')}\n\n*(Esta mensagem é estritamente interna e não é exibida ao cliente).*`;
        }

        const internalMsg: ChatMessage = {
            id: `msg_internal_${now}`,
            sender: 'system',
            agentName: operatorName,
            text: internalText,
            timestamp: now,
            isInternal: true,
            internalCategory,
        };

        session.messages.push(internalMsg);
        session.updatedAt = now;
        this.databaseService.saveSession(session);

        return {
            session,
            customer,
            message: feedbackMessage,
            actionResult,
        };
    }

    public resetSession(customerId: string): { success: boolean; newCustomerId: string } {
        if (!customerId) {
            throw new BadRequestException('customerId is required');
        }

        this.databaseService.deleteSessionByCustomerId(customerId);

        const newCustomerId = `guest_${Date.now()}`;

        return {
            success: true,
            newCustomerId,
        };
    }

    public getProviders(): {
        providers: unknown[];
        activeProvider: string;
        activeModel: string;
    } {
        const providers = this.llmService.listProviders();
        const activeProvider = this.llmService.getActiveProviderId();
        const activeModel = this.llmService.getActiveModel();

        return {
            providers,
            activeProvider,
            activeModel,
        };
    }

    public setProvider(
        providerId: string,
        model?: string
    ): { success: boolean; activeProvider: string; activeModel: string } {
        if (!providerId) {
            throw new BadRequestException('providerId is required');
        }

        this.llmService.setActiveProvider(providerId, model);

        return {
            success: true,
            activeProvider: this.llmService.getActiveProviderId(),
            activeModel: this.llmService.getActiveModel(),
        };
    }

    public signContract(contractId: string) {
        if (!contractId) {
            throw new BadRequestException('contractId is required');
        }

        const contract = this.databaseService.signContract(contractId);

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        return {
            success: true,
            contract,
            message: `Contract ${contractId} signed successfully`,
        };
    }

    public getContract(contractId: string) {
        if (!contractId) {
            throw new BadRequestException('contractId is required');
        }

        const contract = this.databaseService.findContractById(contractId);

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        return {
            success: true,
            contract,
        };
    }

    public getAllSessions(): Array<{
        session: ChatSession;
        customer: Customer;
        lastMessage?: ChatMessage;
        messageCount: number;
    }> {
        const rawSessions = this.databaseService.getSessions() || [];
        const result: Array<{
            session: ChatSession;
            customer: Customer;
            lastMessage?: ChatMessage;
            messageCount: number;
        }> = [];

        for (const session of rawSessions) {
            this.ensureSessionAttendance(session);
            const customer = this.databaseService.findCustomerById(session.customerId) || {
                id: session.customerId,
                name: 'Visitante',
                invoices: [],
                isIdentified: false,
            };

            const lastMessage =
                session.messages && session.messages.length > 0
                    ? session.messages[session.messages.length - 1]
                    : undefined;

            result.push({
                session,
                customer,
                lastMessage,
                messageCount: session.messages?.length || 0,
            });
        }

        result.sort((a, b) => (b.session.updatedAt || 0) - (a.session.updatedAt || 0));

        return result;
    }
}
