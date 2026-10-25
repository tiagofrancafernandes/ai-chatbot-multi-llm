import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { InitChatDto } from './dto/init-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SwitchProviderDto } from './dto/switch-provider.dto';
import { TransferAttendanceDto } from './dto/transfer-attendance.dto';
import { AgentMessageDto } from './dto/agent-message.dto';
import { ResumeAiDto } from './dto/resume-ai.dto';
import { OperatorActionDto } from './dto/operator-action.dto';

@Controller('api/chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post('init')
    @HttpCode(HttpStatus.OK)
    public async initChat(@Body() dto: InitChatDto) {
        return this.chatService.initChat(dto);
    }

    @Post('message')
    @HttpCode(HttpStatus.OK)
    public async sendMessage(@Body() dto: SendMessageDto) {
        return this.chatService.sendMessage(dto);
    }

    @Get('history')
    public getHistory(@Query('customerId') customerId: string, @Query('scope') scope?: string) {
        return this.chatService.getHistory(customerId, scope);
    }

    @Post('operator-action')
    @HttpCode(HttpStatus.OK)
    public executeOperatorAction(@Body() dto: OperatorActionDto) {
        return this.chatService.executeOperatorAction(dto);
    }

    @Get('sessions')
    public getSessions() {
        return this.chatService.getAllSessions();
    }

    @Post('reset')
    @HttpCode(HttpStatus.OK)
    public resetSession(@Body('customerId') customerId: string) {
        return this.chatService.resetSession(customerId);
    }

    @Get('providers')
    public getProviders() {
        return this.chatService.getProviders();
    }

    @Post('providers/switch')
    @HttpCode(HttpStatus.OK)
    public switchProvider(@Body() dto: SwitchProviderDto) {
        return this.chatService.setProvider(dto.providerId, dto.model);
    }

    @Post('contract/sign/:contractId')
    @HttpCode(HttpStatus.OK)
    public signContract(@Param('contractId') contractId: string) {
        return this.chatService.signContract(contractId);
    }

    @Post('transfer')
    @HttpCode(HttpStatus.OK)
    public transferAttendance(@Body() dto: TransferAttendanceDto) {
        return this.chatService.transferAttendance(dto);
    }

    @Post('agent-message')
    @HttpCode(HttpStatus.OK)
    public sendAgentMessage(@Body() dto: AgentMessageDto) {
        return this.chatService.sendAgentMessage(dto);
    }

    @Post('resume-ai')
    @HttpCode(HttpStatus.OK)
    public resumeAiAttendance(@Body() dto: ResumeAiDto) {
        return this.chatService.resumeAiAttendance(dto);
    }

    @Get('agents')
    public getAgents() {
        return this.chatService.getAttendanceDeskInfo();
    }

    @Get('contract/:contractId')
    public getContract(@Param('contractId') contractId: string) {
        return this.chatService.getContract(contractId);
    }
}
