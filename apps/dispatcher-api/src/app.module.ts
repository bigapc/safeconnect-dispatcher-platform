import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '@/auth/auth.module';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { PrismaModule } from '@/prisma/prisma.module';
import { DashboardController } from '@/dashboard/dashboard.controller';
import { UserController } from '@/users/user.controller';
import { OrganizationController } from '@/organizations/organization.controller';
import { AssignmentModule } from '@/assignments/assignment.module';
import { CourierModule } from '@/courier/courier.module';
import { AiDispatchModule } from '@/ai-dispatch/ai-dispatch.module';
import { AcademyModule } from '@/academy/academy.module';
import { NotificationModule } from '@/notifications/notification.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { ReliabilityModule } from '@/reliability/reliability.module';
import { GlobalExceptionFilter } from '@/reliability/global-exception.filter';
import { RateLimitGuard } from '@/reliability/rate-limit.guard';
import { TimeoutInterceptor } from '@/reliability/timeout.interceptor';
import { loadEnvironment } from './config/env';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadEnvironment],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    AssignmentModule,
    CourierModule,
    AiDispatchModule,
    AcademyModule,
    NotificationModule,
    RealtimeModule,
    ReliabilityModule,
  ],
  controllers: [AppController, DashboardController, UserController, OrganizationController],
  providers: [
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}
