import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class TransferAttendanceDto {
    @IsNotEmpty()
    @IsString()
    public customerId!: string;

    @IsOptional()
    @IsString()
    public departmentId?: string;

    @IsOptional()
    @IsString()
    public agentId?: string;

    @IsOptional()
    @IsNumber()
    public timeoutSeconds?: number;
}
