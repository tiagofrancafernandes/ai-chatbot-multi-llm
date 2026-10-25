export type AttendanceMode = 'ai' | 'human_queued' | 'human_active';

export interface AttendanceAssignedTo {
    type: 'ai' | 'queue' | 'agent';
    id?: string;
    name: string;
    department?: string;
    avatar?: string;
}

export interface AttendanceQueueInfo {
    department: string;
    departmentName: string;
    position: number;
    estimatedWaitSeconds: number;
    enteredAt: number;
}

export interface AttendanceInfo {
    mode: AttendanceMode;
    assignedTo: AttendanceAssignedTo;
    queue?: AttendanceQueueInfo;
    pausedAt?: number;
    timeoutSeconds: number;
    lastAgentInteractionAt?: number;
    lastCustomerInteractionAt?: number;
}

export interface HumanAgent {
    id: string;
    name: string;
    department: string;
    departmentName: string;
    isOnline: boolean;
    avatar?: string;
}

export interface AttendanceDepartment {
    id: string;
    name: string;
    description: string;
    availableAgentsCount: number;
    estimatedWaitSeconds: number;
}
