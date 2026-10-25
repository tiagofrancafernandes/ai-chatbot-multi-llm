import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AgentMessageDto {
    @IsNotEmpty()
    @IsString()
    public customerId!: string;

    @IsNotEmpty()
    @IsString()
    public text!: string;

    @IsOptional()
    @IsString()
    public agentName?: string;

    @IsOptional()
    @IsString()
    public agentId?: string;

    @IsOptional()
    @IsBoolean()
    public isInternal?: boolean;
}
