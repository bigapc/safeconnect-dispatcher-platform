import { AssignmentService } from '@/assignments/assignment.service';

describe('AssignmentService', () => {
  const prisma = {
    assignment: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    courier: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const aiDispatchService = {
    recommendCourierForAssignment: jest.fn(),
  };

  const jobService = {
    runWithRetry: jest.fn(),
  };

  const realtime = {
    emitAssignmentCreated: jest.fn(),
    emitAssignmentAssigned: jest.fn(),
    emitAssignmentUpdated: jest.fn(),
    emitAssignmentStatusChanged: jest.fn(),
    emitAssignmentCompleted: jest.fn(),
  };

  const service = new AssignmentService(
    aiDispatchService as never,
    prisma as never,
    realtime as never,
    jobService as never,
  );

  const user = { sub: 'u1', orgId: 'org1', role: 'Dispatcher' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates assignment and returns AI recommendation payload', async () => {
    prisma.assignment.create.mockResolvedValue({
      id: 'a1',
      title: 'Pickup',
      description: 'Desc',
      pickupAddress: 'A',
      pickupLatitude: 1,
      pickupLongitude: 2,
      dropoffAddress: 'B',
      dropoffLatitude: 3,
      dropoffLongitude: 4,
      status: 'PENDING',
      priority: 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
      courier: null,
    });

    jobService.runWithRetry.mockResolvedValue({
      assignmentId: 'a1',
      recommendations: [],
      recommendedCourier: null,
      message: null,
    });

    const result = await service.createAssignment(user, {
      title: 'Pickup',
      description: 'Desc',
      priority: 'MEDIUM',
      pickupAddress: 'A',
      pickupLatitude: 1,
      pickupLongitude: 2,
      dropoffAddress: 'B',
      dropoffLatitude: 3,
      dropoffLongitude: 4,
    });

    expect(realtime.emitAssignmentCreated).toHaveBeenCalledWith('org1', expect.any(Object));
    expect(result).toMatchObject({
      id: 'a1',
      aiRecommendations: [],
      aiRecommendedCourier: null,
    });
  });

  it('returns paginated assignments', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      1,
      [
        {
          id: 'a1',
          title: 'Task',
          description: 'Desc',
          pickupAddress: null,
          pickupLatitude: null,
          pickupLongitude: null,
          dropoffAddress: null,
          dropoffLatitude: null,
          dropoffLongitude: null,
          status: 'PENDING',
          priority: 'LOW',
          createdAt: new Date(),
          updatedAt: new Date(),
          courier: null,
        },
      ],
    ]);

    const result = await service.getAssignmentsByOrg(user, { page: 1, limit: 10, sortBy: 'createdAt' });

    expect(result).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(Array.isArray(result.data)).toBe(true);
  });
});
