import { IsOptional, IsString } from 'class-validator';

export class InitChatDto {
    @IsOptional()
    @IsString()
    public customerId?: string;

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
