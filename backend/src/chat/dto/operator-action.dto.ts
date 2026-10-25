import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type OperatorActionType =
    | 'suspend_internet'
    | 'activate_internet'
    | 'check_signal'
    | 'reboot_onu'
    | 'view_invoices'
    | 'unlock_promise'
    | 'internal_note';

export class OperatorActionDto {
    @IsNotEmpty()
    @IsString()
    public customerId!: string;

    @IsNotEmpty()
    @IsString()
    @IsIn([
        'suspend_internet',
        'activate_internet',
        'check_signal',
        'reboot_onu',
        'view_invoices',
        'unlock_promise',
        'internal_note',
    ])
    public action!: OperatorActionType;

    @IsOptional()
    @IsString()
    public noteText?: string;

    @IsOptional()
    @IsString()
    public operatorName?: string;
}
