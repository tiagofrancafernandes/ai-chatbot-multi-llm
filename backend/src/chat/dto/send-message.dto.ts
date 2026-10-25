import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    public customerId!: string;

    @IsNotEmpty()
    @IsString()
    public text!: string;

    @IsOptional()
    @IsString()
    public providerId?: string;

    @IsOptional()
    @IsString()
    public model?: string;

    @IsOptional()
    @IsString()
    public scope?: string;
}
