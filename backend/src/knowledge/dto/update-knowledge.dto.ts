import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateKnowledgeDto {
    @IsNotEmpty()
    @IsString()
    companyRules!: string;

    @IsOptional()
    @IsString()
    additionalInstructions?: string;
}
