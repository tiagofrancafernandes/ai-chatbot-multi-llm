import { Customer } from './customer.interface';
import { Plan } from './plan.interface';
import { BusinessHours } from './business-hours.interface';
import { ChatSession } from './chat.interface';
import { FlowDefinition } from './flow.interface';
import { Contract } from './contract.interface';
import { KnowledgeBaseData } from './knowledge.interface';
import { HumanAgent, AttendanceDepartment } from './attendance.interface';

export interface DatabaseSchema {
    customers: Customer[];
    plans: Plan[];
    businessHours: BusinessHours;
    sessions: ChatSession[];
    flow: FlowDefinition;
    contracts: Contract[];
    knowledgeBase: KnowledgeBaseData;
    agents?: HumanAgent[];
    departments?: AttendanceDepartment[];
}
