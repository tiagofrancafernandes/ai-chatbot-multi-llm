import { Controller, Get, Put, Body } from '@nestjs/common';
import { JsonDatabaseService } from '../database/json-database.service';
import { FlowDefinition } from '../common/interfaces/flow.interface';

@Controller('api/flow')
export class FlowController {
    constructor(private readonly databaseService: JsonDatabaseService) {}

    @Get()
    public getFlow(): FlowDefinition {
        return this.databaseService.getFlow();
    }

    @Put()
    public updateFlow(@Body() flow: FlowDefinition): FlowDefinition {
        flow.updatedAt = Date.now();
        return this.databaseService.saveFlow(flow);
    }
}
