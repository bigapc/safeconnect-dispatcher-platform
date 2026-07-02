import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @Req() request: { user: JwtRequestUser },
    @Query('type') type?: NotificationType,
    @Query('onlyUnread') onlyUnread?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.notificationService.listNotifications(request.user, {
      type,
      onlyUnread: onlyUnread === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id/read')
  async markRead(@Req() request: { user: JwtRequestUser }, @Param('id') id: string): Promise<{ success: true }> {
    return this.notificationService.markAsRead(request.user, id);
  }
}
