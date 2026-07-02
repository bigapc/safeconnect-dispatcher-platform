import { Module } from '@nestjs/common';
import { AiDispatchController } from './ai-dispatch.controller';
import { AiDispatchService } from './ai-dispatch.service';

@Module({
  controllers: [AiDispatchController],
  providers: [AiDispatchService],
  exports: [AiDispatchService],
})
export class AiDispatchModule {}
