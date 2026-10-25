import { Injectable, Logger } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { LlmService } from '../llm/llm.service';
import { Customer } from '../common/interfaces/customer.interface';
import { ChatSession, ChatMessage } from '../common/interfaces/chat.interface';
import { IntentAnalysisResult } from '../llm/interfaces/llm-provider.interface';
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

        // Step 1: Execute AI Intent Decision Node
        const analysis = await this.llmService.analyzeIntent(text, providerId, modelOverride);

        session.currentIntent = analysis.primaryIntent;
        session.secondaryRequest = analysis.secondaryRequest;

        let activeNodeId = flow.entryNodeId;
        let botResponse = '';

        // Step 2: Identification & Authentication Guard
        if (!customer.isIdentified) {
            const authResult = this.tryAuthenticateCustomer(text, analysis, customer, session, flow);

            if (authResult.isHandled) {
                botResponse = authResult.response;
                activeNodeId = authResult.nodeId;
                customer = authResult.updatedCustomer;

                return this.finalizeStep(botResponse, analysis, customer, session, activeNodeId);
            }
        }

        // Step 3: Routing for Authenticated Customers
        const routedResult = this.routeIdentifiedCustomer(text, analysis, customer, flow);
        botResponse = routedResult.response;
        activeNodeId = routedResult.nodeId;

        // Step 4: Process Secondary Request Interceptor
        const secondaryNotice = this.processSecondaryRequest(analysis, customer);

        if (secondaryNotice) {
            botResponse = `${botResponse}\n\n${secondaryNotice}`;
        }

        return this.finalizeStep(botResponse, analysis, customer, session, activeNodeId);
    }

    private tryAuthenticateCustomer(
        text: string,
        analysis: IntentAnalysisResult,
        currentCustomer: Customer,
        session: ChatSession,
        flow: FlowDefinition
    ): { isHandled: boolean; response: string; nodeId: string; updatedCustomer: Customer } {
        const candidateIdentifier = analysis.extractedIdentifier || this.extractPhoneOrCpf(text);

        if (candidateIdentifier) {
            const matchedCustomer = this.databaseService.findCustomerByIdentifier(candidateIdentifier);

            if (matchedCustomer) {
                matchedCustomer.isIdentified = true;
                this.databaseService.saveCustomer(matchedCustomer);

                session.customerId = matchedCustomer.id;

                const response = `Identity Confirmed! Welcome back, ${matchedCustomer.name || 'valued customer'}. How can we assist you today?`;
                return {
                    isHandled: true,
                    response,
                    nodeId: 'node_customer_auth_action',
                    updatedCustomer: matchedCustomer,
                };
            }

            const response = `We couldn't locate customer records matching "${candidateIdentifier}". You can check our general plan options, or contact our support team.`;
            return {
                isHandled: true,
                response,
                nodeId: 'node_customer_auth_action',
                updatedCustomer: currentCustomer,
            };
        }

        if (analysis.primaryIntent === 'plan_pricing') {
            const pricingNode = this.findNode(flow, 'node_plan_pricing_action');
            const plans = this.databaseService.getPlans();
            const planLines = plans.map((p) => `• ${p.name}: R$ ${p.price.toFixed(2)}/mo (${p.features.join(', ')})`);
            const response = `Here are our public subscription plans:\n${planLines.join('\n')}\n\nIf you are already a customer, please send your phone number or CPF to view your account details!`;

            return {
                isHandled: true,
                response,
                nodeId: pricingNode?.id || 'node_plan_pricing_action',
                updatedCustomer: currentCustomer,
            };
        }

        if (analysis.primaryIntent === 'greeting') {
            const response = `Hello! Welcome to our automated support center. To assist you properly, please provide your registered phone number or CPF (e.g. '5511999999999'). Or let us know if you want to explore our subscription plans!`;

            return {
                isHandled: true,
                response,
                nodeId: 'node_customer_auth_action',
                updatedCustomer: currentCustomer,
            };
        }

        const response = `Welcome! To access your customer account and services, please provide your registered phone number or CPF (Try mock: '5511999999999'). Or ask about our plans!`;
        return {
            isHandled: true,
            response,
            nodeId: 'node_customer_auth_action',
            updatedCustomer: currentCustomer,
        };
    }

    private routeIdentifiedCustomer(
        text: string,
        analysis: IntentAnalysisResult,
        customer: Customer,
        flow: FlowDefinition
    ): { response: string; nodeId: string } {
        const businessHours = this.databaseService.getBusinessHours();

        if (analysis.primaryIntent === 'greeting') {
            const greetingNode = this.findNode(flow, 'node_greeting_message');
            const template =
                greetingNode?.responseTemplate ||
                'Hello {{customerName}}! Great to see you back. Operating hours: {{businessOpen}} to {{businessClose}}.';

            const response = template
                .replace('{{customerName}}', customer.name || 'Customer')
                .replace('{{businessOpen}}', businessHours.open)
                .replace('{{businessClose}}', businessHours.close);

            return { response, nodeId: 'node_greeting_message' };
        }

        if (analysis.primaryIntent === 'plan_pricing') {
            const plans = this.databaseService.getPlans();
            const planList = plans.map((p) => `• ${p.name}: R$ ${p.price.toFixed(2)}/mo`).join('\n');
            const currentPlanNotice = customer.plan ? `Your active plan is "${customer.plan}".` : 'You do not have an active plan tier yet.';

            const response = `${currentPlanNotice}\n\nAvailable Tiers:\n${planList}\n\nWould you like to upgrade or change your current subscription?`;
            return { response, nodeId: 'node_plan_pricing_action' };
        }

        if (analysis.primaryIntent === 'technical_support') {
            const techNode = this.findNode(flow, 'node_tech_support_message');
            const template =
                techNode?.responseTemplate ||
                'Opening diagnostic ticket. Is your router/link indicator currently blinking red?';

            return { response: template, nodeId: 'node_tech_support_message' };
        }

        if (analysis.primaryIntent === 'financial') {
            const pendingInvoices = customer.invoices.filter((inv) => inv.status === 'pending');
            const paidInvoices = customer.invoices.filter((inv) => inv.status === 'paid');

            let invoiceSummary = `You have ${customer.invoices.length} total invoice(s) on file (${pendingInvoices.length} pending, ${paidInvoices.length} paid).`;

            if (pendingInvoices.length > 0) {
                const list = pendingInvoices.map((inv) => `• Invoice ${inv.id}: R$ ${inv.amount.toFixed(2)} (Due: ${inv.dueDate})`).join('\n');
                invoiceSummary += `\n\nPending statements:\n${list}\nDirect download link: https://billing.company.local/invoice/${customer.id}`;
            }

            if (pendingInvoices.length === 0) {
                invoiceSummary += `\nAll your invoices are up to date! Thank you!`;
            }

            return { response: invoiceSummary, nodeId: 'node_financial_action' };
        }

        const fallbackNode = this.findNode(flow, 'node_fallback_message');
        const fallbackText =
            fallbackNode?.responseTemplate ||
            'We have received your message. How else may we assist you today?';

        return { response: fallbackText, nodeId: 'node_fallback_message' };
    }

    private processSecondaryRequest(analysis: IntentAnalysisResult, customer: Customer): string | null {
        if (analysis.secondaryRequest === 'invoice_request') {
            const pending = customer.invoices.filter((inv) => inv.status === 'pending');

            if (pending.length > 0) {
                const list = pending.map((inv) => `[#${inv.id} - R$ ${inv.amount.toFixed(2)} due ${inv.dueDate}]`).join(', ');
                return `[SystemOne Auto-Trigger]: We also noticed your invoice request! Found ${pending.length} pending statement(s): ${list}. Direct link: https://billing.company.local/quick-pay/${customer.id}`;
            }

            return `[SystemOne Auto-Trigger]: We checked your invoice request: You currently have no pending invoices! All previous statements are settled.`;
        }

        if (analysis.secondaryRequest === 'plan_upgrade') {
            return `[SystemOne Auto-Trigger]: We noted your interest in an upgrade! Our sales team has been notified to send tailored package options.`;
        }

        return null;
    }

    private finalizeStep(
        botResponse: string,
        analysis: IntentAnalysisResult,
        customer: Customer,
        session: ChatSession,
        activeNodeId: string
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
}
