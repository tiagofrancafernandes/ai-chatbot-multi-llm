import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DatabaseModule } from '../database/database.module';
import { LlmModule } from '../llm/llm.module';

@Module({
    imports: [DatabaseModule, LlmModule],
    controllers: [KnowledgeController],
    providers: [KnowledgeService],
    exports: [KnowledgeService],
})
export class KnowledgeModule {}
