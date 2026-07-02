import { Module } from '@nestjs/common';
import { AiDispatchModule } from '@/ai-dispatch/ai-dispatch.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { ReliabilityModule } from '@/reliability/reliability.module';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [RealtimeModule, AiDispatchModule, ReliabilityModule],
  controllers: [AssignmentController],
  providers: [AssignmentService],
})
export class AssignmentModule {}
