import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiDispatchService } from '@/ai-dispatch/ai-dispatch.service';

describe('AiDispatchService', () => {
  const prisma = {
    assignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    courier: {
      findMany: jest.fn(),
    },
  };

  const service = new AiDispatchService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when user has no organization', async () => {
    await expect(
      service.recommendCourierForAssignment({ sub: 'u1', orgId: null, role: 'Dispatcher' }, 'a1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when assignment is missing', async () => {
    prisma.assignment.findFirst.mockResolvedValue(null);

    await expect(
      service.recommendCourierForAssignment({ sub: 'u1', orgId: 'org1', role: 'Dispatcher' }, 'a1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns no recommendations when no couriers available', async () => {
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'a1',
      pickupLatitude: 10,
      pickupLongitude: 10,
      dropoffLatitude: 11,
      dropoffLongitude: 11,
    });
    prisma.courier.findMany.mockResolvedValue([]);

    const result = await service.recommendCourierForAssignment(
      { sub: 'u1', orgId: 'org1', role: 'Dispatcher' },
      'a1',
    );

    expect(result.recommendations).toEqual([]);
    expect(result.recommendedCourier).toBeNull();
  });
});
