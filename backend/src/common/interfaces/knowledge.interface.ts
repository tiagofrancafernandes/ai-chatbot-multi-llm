export interface KnowledgeBaseData {
    companyRules: string;
    additionalInstructions: string;
    cachedSummary: string;
    lastCompiledAt: number;
}

export interface UpdateKnowledgeDto {
    companyRules: string;
    additionalInstructions?: string;
}
