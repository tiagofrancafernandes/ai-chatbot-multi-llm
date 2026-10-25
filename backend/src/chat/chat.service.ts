import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { FlowEngineService } from '../flow/flow-engine.service';
import { LlmService } from '../llm/llm.service';
import { InitChatDto } from './dto/init-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Customer } from '../common/interfaces/customer.interface';
import { ChatSession, ChatMessage } from '../common/interfaces/chat.interface';

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
                text: 'Hello! Welcome to our automated portal. Before we proceed, are you an active customer?',
                timestamp: Date.now(),
                nodeId: 'node_intent_decision',
            };

            session = {
                id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                customerId: customer.id,
                messages: [initialGreeting],
                activeNodeId: 'node_intent_decision',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            this.databaseService.saveSession(session);
        }

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
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            this.databaseService.saveSession(session);
        }

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
}
