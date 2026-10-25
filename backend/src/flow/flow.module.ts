import { Module } from '@nestjs/common';
import { FlowEngineService } from './flow-engine.service';

@Module({
    providers: [FlowEngineService],
    exports: [FlowEngineService],
})
export class FlowModule {}
