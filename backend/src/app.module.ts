import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { LlmModule } from './llm/llm.module';
import { FlowModule } from './flow/flow.module';
import { ChatModule } from './chat/chat.module';
import { CustomerModule } from './customer/customer.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../.env'],
        }),
        DatabaseModule,
        LlmModule,
        FlowModule,
        ChatModule,
        CustomerModule,
    ],
})
export class AppModule {}
