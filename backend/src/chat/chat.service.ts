import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { FlowEngineService } from '../flow/flow-engine.service';
import { LlmService } from '../llm/llm.service';
import { InitChatDto } from './dto/init-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TransferAttendanceDto } from './dto/transfer-attendance.dto';
import { AgentMessageDto } from './dto/agent-message.dto';
import { ResumeAiDto } from './dto/resume-ai.dto';
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

        return {
            session,
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

            return {
                session,
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

        return {
            session: flowResult.session,
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

        const agentMsg: ChatMessage = {
            id: `msg_agent_${now}`,
            sender: 'agent',
            agentName,
            text: dto.text.trim(),
            timestamp: now,
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

    public getHistory(customerId: string): ChatSession {
        if (!customerId) {
            throw new BadRequestException('customerId query parameter is required');
        }

        const session = this.databaseService.findSessionByCustomerId(customerId);

        if (!session) {
            throw new NotFoundException(`No chat session found for customerId: ${customerId}`);
        }

        return session;
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
}
