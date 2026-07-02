import { Module } from '@nestjs/common';
import { RealtimeModule } from '@/realtime/realtime.module';
import { CourierController } from './courier.controller';

@Module({
  imports: [RealtimeModule],
  controllers: [CourierController],
})
export class CourierModule {}
