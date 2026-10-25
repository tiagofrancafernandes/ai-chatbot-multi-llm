import { IsNotEmpty, IsString } from 'class-validator';

export class ResumeAiDto {
    @IsNotEmpty()
    @IsString()
    public customerId!: string;
}
