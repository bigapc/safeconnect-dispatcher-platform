import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@/auth/auth.module';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { PrismaModule } from '@/prisma/prisma.module';
import { DashboardController } from '@/dashboard/dashboard.controller';
import { UserController } from '@/users/user.controller';
import { OrganizationController } from '@/organizations/organization.controller';
import { AssignmentModule } from '@/assignments/assignment.module';
import { CourierModule } from '@/courier/courier.module';
import { AiDispatchModule } from '@/ai-dispatch/ai-dispatch.module';
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
  ],
  controllers: [AppController, DashboardController, UserController, OrganizationController],
  providers: [RolesGuard],
})
export class AppModule {}
