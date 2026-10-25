import { Module } from '@nestjs/common';
import { FlowController } from './flow.controller';
import { FlowEngineService } from './flow-engine.service';

@Module({
    controllers: [FlowController],
    providers: [FlowEngineService],
    exports: [FlowEngineService],
})
export class FlowModule {}
