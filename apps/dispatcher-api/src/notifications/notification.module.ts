import { Module } from '@nestjs/common';
import { RealtimeModule } from '@/realtime/realtime.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  imports: [RealtimeModule],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, SmsService],
  exports: [NotificationService],
})
export class NotificationModule {}
