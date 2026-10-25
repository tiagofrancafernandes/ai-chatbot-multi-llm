import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSchema } from '../common/interfaces/database.interface';
import { Customer } from '../common/interfaces/customer.interface';
import { Plan } from '../common/interfaces/plan.interface';
import { BusinessHours } from '../common/interfaces/business-hours.interface';
import { ChatSession } from '../common/interfaces/chat.interface';
import { FlowDefinition } from '../common/interfaces/flow.interface';
import { Contract } from '../common/interfaces/contract.interface';
import { KnowledgeBaseData } from '../common/interfaces/knowledge.interface';
import { HumanAgent, AttendanceDepartment } from '../common/interfaces/attendance.interface';
import { INITIAL_DATABASE_DATA } from './default-database';

@Injectable()
export class JsonDatabaseService implements OnModuleInit {
    private readonly logger = new Logger(JsonDatabaseService.name);
    private databaseFilePath = '';
    private cache: DatabaseSchema | null = null;

    constructor(private readonly configService: ConfigService) {}

    public onModuleInit(): void {
        const configuredPath = this.configService.get<string>('DATABASE_FILE_PATH');

        if (configuredPath) {
            this.databaseFilePath = path.resolve(configuredPath);
        }

        if (!configuredPath) {
            this.databaseFilePath = path.resolve(process.cwd(), 'data', 'db.json');
        }

        this.ensureDatabaseFileExists();
        this.loadDatabase();
        this.logger.log(`JSON Database initialized at path: ${this.databaseFilePath}`);
    }

    public getDatabase(): DatabaseSchema {
        if (!this.cache) {
            this.loadDatabase();
        }

        return this.cache as DatabaseSchema;
    }

    public saveDatabase(database: DatabaseSchema): void {
        if (!database) {
            throw new Error('Database payload cannot be undefined or null');
        }

        this.cache = database;

        const directoryPath = path.dirname(this.databaseFilePath);

        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }

        const serialized = JSON.stringify(database, null, 4);

        fs.writeFileSync(this.databaseFilePath, serialized, 'utf-8');
    }

    public getCustomers(): Customer[] {
        const currentDatabase = this.getDatabase();

        return currentDatabase.customers;
    }

    public findCustomerById(customerId: string): Customer | undefined {
        if (!customerId) {
            return undefined;
        }

        const currentDatabase = this.getDatabase();

        const customer = currentDatabase.customers.find((item) => {
            return item.id === customerId;
        });

        return customer;
    }

    public findCustomerByIdentifier(identifier: string): Customer | undefined {
        if (!identifier) {
            return undefined;
        }

        const normalized = identifier.trim();

        if (!normalized) {
            return undefined;
        }

        const cleanDigits = normalized.replace(/\D/g, '');
        const currentDatabase = this.getDatabase();

        const customer = currentDatabase.customers.find((item) => {
            const matchesExactId = item.id === normalized;
            const matchesExactPhone = item.phone === normalized;
            const matchesExactCpf = item.cpfCnpj === normalized;

            if (matchesExactId || matchesExactPhone || matchesExactCpf) {
                return true;
            }

            if (cleanDigits.length >= 8) {
                const itemPhoneDigits = (item.phone || '').replace(/\D/g, '');
                const itemCpfDigits = (item.cpfCnpj || '').replace(/\D/g, '');
                const itemIdDigits = (item.id || '').replace(/\D/g, '');

                const matchesPhoneDigits =
                    itemPhoneDigits.length >= 8 &&
                    (itemPhoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(itemPhoneDigits));

                const matchesCpfDigits = cleanDigits.length === 11 && itemCpfDigits === cleanDigits;

                const matchesIdDigits =
                    itemIdDigits.length >= 8 &&
                    (itemIdDigits === cleanDigits ||
                        itemIdDigits.endsWith(cleanDigits) ||
                        cleanDigits.endsWith(itemIdDigits));

                return matchesPhoneDigits || matchesCpfDigits || matchesIdDigits;
            }

            return false;
        });

        return customer;
    }

    public saveCustomer(customer: Customer): Customer {
        if (!customer) {
            throw new Error('Customer cannot be null or undefined');
        }

        if (!customer.id) {
            throw new Error('Customer ID is required');
        }

        const currentDatabase = this.getDatabase();

        const existingIndex = currentDatabase.customers.findIndex((item) => {
            return item.id === customer.id;
        });

        if (existingIndex >= 0) {
            currentDatabase.customers[existingIndex] = customer;
            this.saveDatabase(currentDatabase);
            return customer;
        }

        currentDatabase.customers.push(customer);

        this.saveDatabase(currentDatabase);

        return customer;
    }

    public getPlans(): Plan[] {
        const currentDatabase = this.getDatabase();

        return currentDatabase.plans;
    }

    public getBusinessHours(): BusinessHours {
        const currentDatabase = this.getDatabase();

        return currentDatabase.businessHours;
    }

    public getSessions(): ChatSession[] {
        const currentDatabase = this.getDatabase();

        return currentDatabase.sessions;
    }

    public findSessionByCustomerId(customerId: string): ChatSession | undefined {
        if (!customerId) {
            return undefined;
        }

        const currentDatabase = this.getDatabase();

        const session = currentDatabase.sessions.find((item) => {
            return item.customerId === customerId;
        });

        return session;
    }

    public findSessionById(sessionId: string): ChatSession | undefined {
        if (!sessionId) {
            return undefined;
        }

        const currentDatabase = this.getDatabase();

        const session = currentDatabase.sessions.find((item) => {
            return item.id === sessionId;
        });

        return session;
    }

    public saveSession(session: ChatSession): ChatSession {
        if (!session) {
            throw new Error('Session cannot be null or undefined');
        }

        if (!session.id) {
            throw new Error('Session ID is required');
        }

        const currentDatabase = this.getDatabase();

        const existingIndex = currentDatabase.sessions.findIndex((item) => {
            return item.id === session.id;
        });

        if (existingIndex >= 0) {
            currentDatabase.sessions[existingIndex] = session;
            this.saveDatabase(currentDatabase);
            return session;
        }

        currentDatabase.sessions.push(session);

        this.saveDatabase(currentDatabase);

        return session;
    }

    public deleteSessionByCustomerId(customerId: string): boolean {
        if (!customerId) {
            return false;
        }

        const currentDatabase = this.getDatabase();

        const initialLength = currentDatabase.sessions.length;

        currentDatabase.sessions = currentDatabase.sessions.filter((item) => {
            return item.customerId !== customerId;
        });

        const wasRemoved = currentDatabase.sessions.length < initialLength;

        if (wasRemoved) {
            this.saveDatabase(currentDatabase);
        }

        return wasRemoved;
    }

    public getContracts(): Contract[] {
        const currentDatabase = this.getDatabase();

        if (!currentDatabase.contracts) {
            currentDatabase.contracts = [];
        }

        return currentDatabase.contracts;
    }

    public findContractById(id: string): Contract | null {
        if (!id) {
            return null;
        }

        const contracts = this.getContracts();

        const match = contracts.find((item) => {
            return item.id === id;
        });

        if (!match) {
            return null;
        }

        return match;
    }

    public saveContract(contract: Contract): Contract {
        if (!contract) {
            throw new Error('Contract object cannot be empty');
        }

        if (!contract.id) {
            throw new Error('Contract ID is required');
        }

        const currentDatabase = this.getDatabase();

        if (!currentDatabase.contracts) {
            currentDatabase.contracts = [];
        }

        const existingIndex = currentDatabase.contracts.findIndex((item) => {
            return item.id === contract.id;
        });

        if (existingIndex >= 0) {
            currentDatabase.contracts[existingIndex] = contract;
            this.saveDatabase(currentDatabase);
            return contract;
        }

        currentDatabase.contracts.push(contract);
        this.saveDatabase(currentDatabase);

        return contract;
    }

    public signContract(id: string): Contract | null {
        if (!id) {
            return null;
        }

        const contract = this.findContractById(id);

        if (!contract) {
            return null;
        }

        contract.status = 'signed';
        contract.signedAt = Date.now();

        return this.saveContract(contract);
    }

    public getFlow(): FlowDefinition {
        const currentDatabase = this.getDatabase();

        return currentDatabase.flow;
    }

    public saveFlow(flow: FlowDefinition): FlowDefinition {
        if (!flow) {
            throw new Error('Flow definition cannot be null or undefined');
        }

        if (!flow.id) {
            throw new Error('Flow ID is required');
        }

        const currentDatabase = this.getDatabase();

        currentDatabase.flow = flow;

        this.saveDatabase(currentDatabase);

        return flow;
    }

    private ensureDatabaseFileExists(): void {
        const directoryPath = path.dirname(this.databaseFilePath);

        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
        }

        if (fs.existsSync(this.databaseFilePath)) {
            return;
        }

        this.logger.log('Database file not found. Populating with initial mock data...');

        const serialized = JSON.stringify(INITIAL_DATABASE_DATA, null, 4);

        fs.writeFileSync(this.databaseFilePath, serialized, 'utf-8');
    }

    public getKnowledgeBase(): KnowledgeBaseData {
        const currentDatabase = this.getDatabase();

        if (!currentDatabase.knowledgeBase) {
            currentDatabase.knowledgeBase = { ...INITIAL_DATABASE_DATA.knowledgeBase };
            this.saveDatabase(currentDatabase);
        }

        return currentDatabase.knowledgeBase;
    }

    public saveKnowledgeBase(data: KnowledgeBaseData): KnowledgeBaseData {
        const currentDatabase = this.getDatabase();

        currentDatabase.knowledgeBase = {
            ...data,
        };

        this.saveDatabase(currentDatabase);

        return currentDatabase.knowledgeBase;
    }

    public getDepartments(): AttendanceDepartment[] {
        const db = this.getDatabase();
        return db.departments || [];
    }

    public findDepartmentById(id: string): AttendanceDepartment | undefined {
        const departments = this.getDepartments();
        return departments.find((d) => d.id === id);
    }

    public getAgents(): HumanAgent[] {
        const db = this.getDatabase();
        return db.agents || [];
    }

    public findAgentById(id: string): HumanAgent | undefined {
        const agents = this.getAgents();
        return agents.find((a) => a.id === id);
    }

    public saveAgent(agent: HumanAgent): void {
        const db = this.getDatabase();

        if (!db.agents) {
            db.agents = [];
        }

        const index = db.agents.findIndex((a) => a.id === agent.id);

        if (index >= 0) {
            db.agents[index] = agent;
        }

        if (index === -1) {
            db.agents.push(agent);
        }

        this.saveDatabase(db);
    }

    private loadDatabase(): void {
        if (!fs.existsSync(this.databaseFilePath)) {
            this.ensureDatabaseFileExists();
        }

        try {
            const fileContent = fs.readFileSync(this.databaseFilePath, 'utf-8');
            this.cache = JSON.parse(fileContent);

            if (this.cache && !this.cache.contracts) {
                this.cache.contracts = [];
            }

            if (this.cache && (!this.cache.departments || this.cache.departments.length === 0)) {
                this.cache.departments = [...(INITIAL_DATABASE_DATA.departments || [])];
                this.saveDatabase(this.cache);
            }

            if (this.cache && (!this.cache.agents || this.cache.agents.length === 0)) {
                this.cache.agents = [...(INITIAL_DATABASE_DATA.agents || [])];
                this.saveDatabase(this.cache);
            }

            if (this.cache && !this.cache.knowledgeBase) {
                this.cache.knowledgeBase = { ...INITIAL_DATABASE_DATA.knowledgeBase };
                this.saveDatabase(this.cache);
            }

            if (this.cache) {
                const hasOldPlans = this.cache.plans.some((p) => p.name === 'Starter' || p.name === 'Professional');

                if (hasOldPlans) {
                    this.cache.plans = [...INITIAL_DATABASE_DATA.plans];
                    this.cache.businessHours = { ...INITIAL_DATABASE_DATA.businessHours };
                    this.cache.knowledgeBase = { ...INITIAL_DATABASE_DATA.knowledgeBase };
                    this.saveDatabase(this.cache);
                }
            }

            if (this.cache?.flow?.nodes) {
                const hasRegistrationNode = this.cache.flow.nodes.some(
                    (node) => node.id === 'node_customer_registration_action'
                );

                if (!hasRegistrationNode) {
                    const registrationNode = INITIAL_DATABASE_DATA.flow.nodes.find(
                        (node) => node.id === 'node_customer_registration_action'
                    );

                    if (registrationNode) {
                        this.cache.flow.nodes.push(registrationNode);
                    }

                    const decisionNode = this.cache.flow.nodes.find((node) => node.id === 'node_intent_decision');

                    if (decisionNode) {
                        const initDecisionNode = INITIAL_DATABASE_DATA.flow.nodes.find(
                            (node) => node.id === 'node_intent_decision'
                        );

                        if (initDecisionNode) {
                            decisionNode.transitions = initDecisionNode.transitions;
                        }
                    }

                    this.saveDatabase(this.cache);
                }
            }
        } catch (error) {
            this.logger.error(`Error reading database file: ${(error as Error).message}. Resetting to initial data.`);
            this.cache = INITIAL_DATABASE_DATA;
            this.saveDatabase(INITIAL_DATABASE_DATA);
        }
    }
}
