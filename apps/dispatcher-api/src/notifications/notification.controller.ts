import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { NotificationChannel } from '@prisma/client';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RateLimit } from '@/reliability/rate-limit.decorator';
import { NotificationService } from './notification.service';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@RateLimit('moderate')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @Req() request: { user: JwtRequestUser },
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('onlyUnread') onlyUnread?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<unknown> {
    const channel = this.parseChannel(type);

    const paginated = await this.notificationService.listNotifications(request.user, {
      channel,
      status: this.parseStatus(status),
      onlyUnread: onlyUnread === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortOrder,
    });

    const wantsExtendedResponse = Boolean(type || status || onlyUnread || page || limit || sortOrder);
    return wantsExtendedResponse ? paginated : paginated.data;
  }

  @Patch(':id/read')
  async markRead(@Req() request: { user: JwtRequestUser }, @Param('id') id: string): Promise<{ success: true }> {
    return this.notificationService.markAsRead(request.user, id);
  }

  private parseChannel(value?: string): NotificationChannel | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.toUpperCase();
    const channels: NotificationChannel[] = ['EMAIL', 'SMS', 'IN_APP', 'PUSH'];
    return channels.includes(normalized as NotificationChannel)
      ? (normalized as NotificationChannel)
      : undefined;
  }

  private parseStatus(value?: string): 'PENDING' | 'SENT' | 'FAILED' | 'READ' | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.toUpperCase();
    const statuses: Array<'PENDING' | 'SENT' | 'FAILED' | 'READ'> = ['PENDING', 'SENT', 'FAILED', 'READ'];
    return statuses.includes(normalized as (typeof statuses)[number])
      ? (normalized as (typeof statuses)[number])
      : undefined;
  }
}
