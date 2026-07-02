import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

type CourierOperationalStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface CourierPerformanceMetrics {
  completionRate: number;
  averageCompletionMinutes: number | null;
}

interface CourierRecommendation {
  courierId: string;
  courierName: string;
  status: CourierOperationalStatus;
  score: number;
  etaMinutes: number | null;
  distanceMeters: number | null;
  workload: number;
  performanceScore: number;
}

interface RecommendationResult {
  assignmentId: string;
  recommendations: CourierRecommendation[];
  recommendedCourier: CourierRecommendation | null;
  message: string | null;
}

const EARTH_RADIUS_METERS = 6_371_000;
const ASSUMED_TRAVEL_SPEED_KPH = 35;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const normalizeDescending = (value: number, minValue: number, maxValue: number): number => {
  if (maxValue === minValue) {
    return 100;
  }

  return ((maxValue - value) / (maxValue - minValue)) * 100;
};

const calculateDistanceMeters = (from: Coordinate, to: Coordinate): number => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitudeRadians = toRadians(from.latitude);
  const toLatitudeRadians = toRadians(to.latitude);

  const haversineA =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const haversineC = 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));

  return EARTH_RADIUS_METERS * haversineC;
};

@Injectable()
export class AiDispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendCourierForAssignment(user: JwtRequestUser, assignmentId: string): Promise<RecommendationResult> {
    const organizationId = this.requireOrganization(user);

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        organizationId,
      },
      select: {
        id: true,
        pickupLatitude: true,
        pickupLongitude: true,
        dropoffLatitude: true,
        dropoffLongitude: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const couriers = await this.prisma.courier.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        isOnline: true,
        lastLatitude: true,
        lastLongitude: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });

    if (couriers.length === 0) {
      return {
        assignmentId,
        recommendations: [],
        recommendedCourier: null,
        message: 'No couriers available for this organization',
      };
    }

    const courierIds = couriers.map((courier) => courier.id);

    const [activeWorkload, historicalAssignments] = await Promise.all([
      this.prisma.assignment.groupBy({
        by: ['courierId'],
        where: {
          organizationId,
          courierId: { in: courierIds },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.assignment.findMany({
        where: {
          organizationId,
          courierId: { in: courierIds },
          status: { in: ['COMPLETED', 'CANCELLED'] },
        },
        select: {
          courierId: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    const workloadByCourier = new Map<string, number>();
    activeWorkload.forEach((entry) => {
      if (entry.courierId) {
        workloadByCourier.set(entry.courierId, entry._count._all);
      }
    });

    const performanceByCourier = new Map<string, CourierPerformanceMetrics>();
    courierIds.forEach((courierId) => {
      const courierHistory = historicalAssignments.filter((assignmentEntry) => assignmentEntry.courierId === courierId);
      const totalHistorical = courierHistory.length;
      const completed = courierHistory.filter((assignmentEntry) => assignmentEntry.status === 'COMPLETED');

      const completionRate = totalHistorical === 0 ? 0.5 : completed.length / totalHistorical;

      const completedDurations = completed
        .filter((assignmentEntry) => assignmentEntry.completedAt)
        .map((assignmentEntry) => {
          const completedAt = assignmentEntry.completedAt ?? assignmentEntry.createdAt;
          const diffMs = completedAt.getTime() - assignmentEntry.createdAt.getTime();
          return diffMs / 60_000;
        })
        .filter((duration) => Number.isFinite(duration) && duration > 0);

      const averageCompletionMinutes =
        completedDurations.length > 0
          ? completedDurations.reduce((sum, duration) => sum + duration, 0) / completedDurations.length
          : null;

      performanceByCourier.set(courierId, {
        completionRate,
        averageCompletionMinutes,
      });
    });

    const pickupCoordinate =
      assignment.pickupLatitude !== null && assignment.pickupLongitude !== null
        ? {
            latitude: assignment.pickupLatitude,
            longitude: assignment.pickupLongitude,
          }
        : null;

    const dropoffCoordinate =
      assignment.dropoffLatitude !== null && assignment.dropoffLongitude !== null
        ? {
            latitude: assignment.dropoffLatitude,
            longitude: assignment.dropoffLongitude,
          }
        : null;

    const distanceByCourier = new Map<string, number | null>();

    couriers.forEach((courier) => {
      if (
        pickupCoordinate &&
        courier.lastLatitude !== null &&
        courier.lastLongitude !== null
      ) {
        distanceByCourier.set(
          courier.id,
          calculateDistanceMeters(
            { latitude: courier.lastLatitude, longitude: courier.lastLongitude },
            pickupCoordinate,
          ),
        );
        return;
      }

      distanceByCourier.set(courier.id, null);
    });

    const knownDistances = Array.from(distanceByCourier.values()).filter((value): value is number => value !== null);
    const workloads = couriers.map((courier) => workloadByCourier.get(courier.id) ?? 0);
    const minDistance = knownDistances.length > 0 ? Math.min(...knownDistances) : 0;
    const maxDistance = knownDistances.length > 0 ? Math.max(...knownDistances) : 0;
    const minWorkload = Math.min(...workloads);
    const maxWorkload = Math.max(...workloads);

    const scored = couriers.map((courier) => {
      const workload = workloadByCourier.get(courier.id) ?? 0;
      const distanceMeters = distanceByCourier.get(courier.id) ?? null;
      const performanceMetrics = performanceByCourier.get(courier.id) ?? {
        completionRate: 0.5,
        averageCompletionMinutes: null,
      };

      const isBusy = workload > 0;
      const status: CourierOperationalStatus = !courier.isOnline ? 'OFFLINE' : isBusy ? 'BUSY' : 'ONLINE';

      const distanceScore =
        distanceMeters === null
          ? 50
          : normalizeDescending(distanceMeters, minDistance, maxDistance);
      const workloadScore = normalizeDescending(workload, minWorkload, maxWorkload);
      const statusScore = status === 'ONLINE' ? 100 : status === 'BUSY' ? 55 : 0;

      const averageCompletionMinutes = performanceMetrics.averageCompletionMinutes ?? 45;
      const speedScore = clamp(((60 - averageCompletionMinutes) / 40) * 100, 0, 100);
      const performanceScore = clamp(performanceMetrics.completionRate * 70 + speedScore * 0.3, 0, 100);

      const weightedScore =
        distanceScore * 0.4 + workloadScore * 0.3 + statusScore * 0.2 + performanceScore * 0.1;

      const etaMinutes = this.calculateETA(
        courier.lastLatitude !== null && courier.lastLongitude !== null
          ? { latitude: courier.lastLatitude, longitude: courier.lastLongitude }
          : null,
        pickupCoordinate,
        dropoffCoordinate,
      );

      const recommendation: CourierRecommendation = {
        courierId: courier.id,
        courierName: `${courier.user.firstName} ${courier.user.lastName}`.trim(),
        status,
        score: Math.round(weightedScore * 100) / 100,
        etaMinutes,
        distanceMeters,
        workload,
        performanceScore: Math.round(performanceScore * 100) / 100,
      };

      return recommendation;
    });

    scored.sort((left, right) => right.score - left.score);

    return {
      assignmentId,
      recommendations: scored,
      recommendedCourier: scored[0] ?? null,
      message: scored.length > 0 ? null : 'No couriers available for recommendation',
    };
  }

  calculateETA(
    courierLocation: Coordinate | null,
    pickupLocation: Coordinate | null,
    dropoffLocation: Coordinate | null,
  ): number | null {
    if (!courierLocation || !pickupLocation || !dropoffLocation) {
      return null;
    }

    const courierToPickupDistance = calculateDistanceMeters(courierLocation, pickupLocation);
    const pickupToDropoffDistance = calculateDistanceMeters(pickupLocation, dropoffLocation);
    const totalDistanceMeters = courierToPickupDistance + pickupToDropoffDistance;
    const totalDistanceKilometers = totalDistanceMeters / 1000;

    const etaHours = totalDistanceKilometers / ASSUMED_TRAVEL_SPEED_KPH;
    return Math.max(1, Math.round(etaHours * 60));
  }

  private requireOrganization(user: JwtRequestUser): string {
    if (!user.orgId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.orgId;
  }
}
