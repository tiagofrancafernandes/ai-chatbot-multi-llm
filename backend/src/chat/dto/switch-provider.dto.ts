import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SwitchProviderDto {
    @IsNotEmpty()
    @IsString()
    public providerId!: string;

    @IsOptional()
    @IsString()
    public model?: string;
}
