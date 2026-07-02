import { NotificationService } from '@/notifications/notification.service';

describe('NotificationService', () => {
  const prisma = {
    notification: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const realtime = {
    emitNotificationCreated: jest.fn(),
  };

  const jobService = {
    runWithRetry: jest.fn((_: string, handler: () => Promise<unknown>) => handler()),
  };

  const emailService = {
    send: jest.fn(),
  };

  const smsService = {
    send: jest.fn(),
  };

  const service = new NotificationService(
    prisma as never,
    realtime as never,
    jobService as never,
    emailService as never,
    smsService as never,
  );

  const user = { sub: 'u1', orgId: 'org1', role: 'Dispatcher' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated notification list', async () => {
    prisma.$transaction.mockResolvedValue([1, [{ id: 'n1', channel: 'IN_APP', status: 'SENT' }]]);

    const result = await service.listNotifications(user, { page: 1, limit: 25 });

    expect(result).toMatchObject({ page: 1, limit: 25, total: 1, totalPages: 1 });
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('sends email notification and marks as sent', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'n1' });
    emailService.send.mockResolvedValue(undefined);

    await service.sendEmailNotification({
      organizationId: 'org1',
      userId: 'u1',
      title: 'Subject',
      message: 'Body',
      relatedEntityType: 'ASSIGNMENT',
      relatedEntityId: 'a1',
      html: '<p>Body</p>',
      to: 'a@b.com',
    });

    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'SENT' },
      }),
    );
  });
});
