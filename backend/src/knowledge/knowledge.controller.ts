import { Body, Controller, Get, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeBaseData } from '../common/interfaces/knowledge.interface';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';

@Controller('api/knowledge')
export class KnowledgeController {
    constructor(private readonly knowledgeService: KnowledgeService) {}

    @Get()
    public getKnowledgeBase(): KnowledgeBaseData {
        return this.knowledgeService.getKnowledgeBase();
    }

    @Put()
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    public async updateKnowledgeBase(@Body() dto: UpdateKnowledgeDto): Promise<KnowledgeBaseData> {
        const updated = await this.knowledgeService.updateKnowledge(dto);

        return updated;
    }

    @Post('rebuild-cache')
    public async rebuildCache(): Promise<KnowledgeBaseData> {
        const refreshed = await this.knowledgeService.rebuildCache();

        return refreshed;
    }
}
