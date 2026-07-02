import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { NotificationRelatedEntityType, NotificationType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import {
  assignmentAssignedTemplate,
  assignmentCreatedTemplate,
  courierUpdateTemplate,
  systemAlertTemplate,
} from './templates';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

interface NotificationPayload {
  organizationId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  relatedEntityType: NotificationRelatedEntityType;
  relatedEntityId?: string | null;
}

interface AssignmentNotificationData {
  id: string;
  title: string;
  priority: string;
  status: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  courier?: {
    id: string;
    name: string;
    isOnline: boolean;
  } | null;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async listNotifications(
    user: JwtRequestUser,
    filters: {
      type?: NotificationType;
      onlyUnread?: boolean;
      limit?: number;
    },
  ) {
    const organizationId = this.requireOrganization(user);
    const isAdmin = this.isAdmin(user.role);

    const notifications = await this.prisma.notification.findMany({
      where: {
        organizationId,
        ...(filters.type
          ? {
              type: filters.type,
            }
          : {}),
        ...(filters.onlyUnread
          ? {
              isRead: false,
            }
          : {}),
        OR: [{ userId: null }, { userId: user.sub }],
        ...(isAdmin
          ? {}
          : {
              relatedEntityType: {
                not: 'SYSTEM',
              },
            }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit ?? 50,
    });

    return notifications;
  }

  async markAsRead(user: JwtRequestUser, notificationId: string): Promise<{ success: true }> {
    const organizationId = this.requireOrganization(user);

    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        organizationId,
        OR: [{ userId: null }, { userId: user.sub }],
      },
      select: {
        id: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  async sendInAppNotification(payload: Omit<NotificationPayload, 'type' | 'status'>): Promise<void> {
    const created = await this.logNotification({
      ...payload,
      type: 'IN_APP',
      status: 'SENT',
    });

    this.realtime.emitNotificationCreated(payload.organizationId, created, payload.userId ?? null);
  }

  async sendEmailNotification(
    payload: Omit<NotificationPayload, 'type' | 'status'> & { html: string; to: string },
  ): Promise<void> {
    const created = await this.logNotification({
      ...payload,
      type: 'EMAIL',
      status: 'PENDING',
    });

    try {
      await this.emailService.send({
        to: payload.to,
        subject: payload.title,
        html: payload.html,
      });

      await this.prisma.notification.update({
        where: { id: created.id },
        data: { status: 'SENT' },
      });
    } catch {
      await this.prisma.notification.update({
        where: { id: created.id },
        data: { status: 'FAILED' },
      });
    }
  }

  async sendSmsNotification(
    payload: Omit<NotificationPayload, 'type' | 'status'> & { to: string },
  ): Promise<void> {
    const created = await this.logNotification({
      ...payload,
      type: 'SMS',
      status: 'PENDING',
    });

    try {
      await this.smsService.send({
        to: payload.to,
        body: `${payload.title}: ${payload.message}`,
      });

      await this.prisma.notification.update({
        where: { id: created.id },
        data: { status: 'SENT' },
      });
    } catch {
      await this.prisma.notification.update({
        where: { id: created.id },
        data: { status: 'FAILED' },
      });
    }
  }

  async notifyAssignmentCreated(organizationId: string, assignment: AssignmentNotificationData): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        phone: true,
      },
      take: 100,
    });

    const title = `Assignment Created: ${assignment.title}`;
    const message = `${assignment.priority} priority assignment created`;

    await Promise.all(
      users.map(async (user) => {
        await this.sendInAppNotification({
          organizationId,
          userId: user.id,
          title,
          message,
          relatedEntityType: 'ASSIGNMENT',
          relatedEntityId: assignment.id,
        });

        await this.sendEmailNotification({
          organizationId,
          userId: user.id,
          title,
          message,
          relatedEntityType: 'ASSIGNMENT',
          relatedEntityId: assignment.id,
          to: user.email,
          html: assignmentCreatedTemplate(assignment),
        });

        if (assignment.priority === 'HIGH' && user.phone) {
          await this.sendSmsNotification({
            organizationId,
            userId: user.id,
            title,
            message: `${message}. Pickup: ${assignment.pickupAddress ?? 'N/A'}`,
            relatedEntityType: 'ASSIGNMENT',
            relatedEntityId: assignment.id,
            to: user.phone,
          });
        }
      }),
    );
  }

  async notifyAssignmentAssigned(organizationId: string, assignment: AssignmentNotificationData): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
      },
      take: 100,
    });

    const title = `Assignment Assigned: ${assignment.title}`;
    const message = `${assignment.title} has been assigned`;

    await Promise.all(
      users.map(async (user) => {
        await this.sendInAppNotification({
          organizationId,
          userId: user.id,
          title,
          message,
          relatedEntityType: 'ASSIGNMENT',
          relatedEntityId: assignment.id,
        });

        await this.sendEmailNotification({
          organizationId,
          userId: user.id,
          title,
          message,
          relatedEntityType: 'ASSIGNMENT',
          relatedEntityId: assignment.id,
          to: user.email,
          html: assignmentAssignedTemplate(assignment),
        });
      }),
    );
  }

  async notifyAssignmentCompleted(organizationId: string, assignment: AssignmentNotificationData): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
      },
      take: 100,
    });

    const title = `Assignment Completed: ${assignment.title}`;
    const message = `${assignment.title} is now completed`;

    await Promise.all(
      users.map(async (user) => {
        await this.sendInAppNotification({
          organizationId,
          userId: user.id,
          title,
          message,
          relatedEntityType: 'ASSIGNMENT',
          relatedEntityId: assignment.id,
        });
      }),
    );
  }

  async notifyCourierStatusChanged(
    organizationId: string,
    payload: { courierId: string; courierName: string; status: string },
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
      },
      take: 100,
    });

    const title = `Courier Status: ${payload.courierName}`;
    const message = `Courier is now ${payload.status}`;

    await Promise.all(
      users.map(async (user) => {
        await this.sendInAppNotification({
          organizationId,
          userId: user.id,
          title,
          message,
          relatedEntityType: 'COURIER',
          relatedEntityId: payload.courierId,
        });

        await this.sendEmailNotification({
          organizationId,
          userId: user.id,
          title,
          message,
          relatedEntityType: 'COURIER',
          relatedEntityId: payload.courierId,
          to: user.email,
          html: courierUpdateTemplate({
            courierName: payload.courierName,
            status: payload.status,
          }),
        });
      }),
    );
  }

  async notifySystemAlert(
    organizationId: string,
    alert: { title: string; message: string; critical?: boolean },
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: {
          in: ['Admin', 'SuperAdmin', 'OrganizationAdmin'],
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
      },
    });

    await Promise.all(
      admins.map(async (admin) => {
        await this.sendInAppNotification({
          organizationId,
          userId: admin.id,
          title: alert.title,
          message: alert.message,
          relatedEntityType: 'SYSTEM',
          relatedEntityId: null,
        });

        await this.sendEmailNotification({
          organizationId,
          userId: admin.id,
          title: alert.title,
          message: alert.message,
          relatedEntityType: 'SYSTEM',
          relatedEntityId: null,
          to: admin.email,
          html: systemAlertTemplate({
            title: alert.title,
            message: alert.message,
          }),
        });

        if (alert.critical && admin.phone) {
          await this.sendSmsNotification({
            organizationId,
            userId: admin.id,
            title: alert.title,
            message: alert.message,
            relatedEntityType: 'SYSTEM',
            relatedEntityId: null,
            to: admin.phone,
          });
        }
      }),
    );
  }

  async logNotification(payload: NotificationPayload) {
    try {
      return await this.prisma.notification.create({
        data: {
          organizationId: payload.organizationId,
          userId: payload.userId ?? null,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          status: payload.status,
          relatedEntityType: payload.relatedEntityType,
          relatedEntityId: payload.relatedEntityId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to store notification');
      this.logger.debug(String(error));
      throw error;
    }
  }

  private requireOrganization(user: JwtRequestUser): string {
    if (!user.orgId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.orgId;
  }

  private isAdmin(role: string): boolean {
    return ['admin', 'superadmin', 'organizationadmin'].includes(role.toLowerCase());
  }
}
