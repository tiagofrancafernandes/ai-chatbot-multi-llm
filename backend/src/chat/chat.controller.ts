import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { InitChatDto } from './dto/init-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SwitchProviderDto } from './dto/switch-provider.dto';

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
    public getHistory(@Query('customerId') customerId: string) {
        return this.chatService.getHistory(customerId);
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
}
