import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { GlobalExceptionFilter } from './global-exception.filter';
import { JobService } from './job.service';
import { LogRotationService } from './log-rotation.service';
import { LoggerService } from './logger.service';
import { RateLimitGuard } from './rate-limit.guard';
import { TimeoutInterceptor } from './timeout.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [LoggerService, GlobalExceptionFilter, RateLimitGuard, TimeoutInterceptor, JobService, LogRotationService],
  exports: [LoggerService, GlobalExceptionFilter, RateLimitGuard, TimeoutInterceptor, JobService],
})
export class ReliabilityModule {}
