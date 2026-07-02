import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { CourierRealtimeStatusDto, UpdateCourierLocationDto } from './dto/update-courier-location.dto';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

const canDispatchCourierUpdates = (role: string): boolean => {
  return ['dispatcher', 'admin', 'organizationadmin', 'superadmin'].includes(role.toLowerCase());
};

@Controller('courier')
@UseGuards(JwtAuthGuard)
export class CourierController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get('map-state')
  async getMapState(@Req() request: { user: JwtRequestUser }): Promise<unknown> {
    const organizationId = request.user.orgId;
    if (!organizationId) {
      return { success: false, data: { couriers: [], assignments: [] } };
    }

    const [couriers, assignments] = await Promise.all([
      this.prisma.courier.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          isOnline: true,
          lastLatitude: true,
          lastLongitude: true,
          lastUpdatedAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          assignments: {
            where: {
              status: {
                in: ['ASSIGNED', 'IN_PROGRESS'],
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.assignment.findMany({
        where: {
          organizationId,
          OR: [
            {
              pickupLatitude: { not: null },
            },
            {
              pickupLongitude: { not: null },
            },
            {
              dropoffLatitude: { not: null },
            },
            {
              dropoffLongitude: { not: null },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          courierId: true,
          pickupAddress: true,
          pickupLatitude: true,
          pickupLongitude: true,
          dropoffAddress: true,
          dropoffLatitude: true,
          dropoffLongitude: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
    ]);

    return {
      success: true,
      data: {
        couriers: couriers.map((courier) => {
          const currentAssignment = courier.assignments[0] ?? null;
          const operationalStatus = !courier.isOnline
            ? 'OFFLINE'
            : currentAssignment
              ? 'BUSY'
              : 'IDLE';

          return {
            id: courier.id,
            name: `${courier.user.firstName} ${courier.user.lastName}`.trim(),
            isOnline: courier.isOnline,
            status: operationalStatus,
            lastLatitude: courier.lastLatitude,
            lastLongitude: courier.lastLongitude,
            lastUpdatedAt: courier.lastUpdatedAt,
            currentAssignment,
          };
        }),
        assignments,
      },
    };
  }

  @Patch('location')
  async updateLocation(
    @Req() request: { user: JwtRequestUser },
    @Body() dto: UpdateCourierLocationDto,
  ): Promise<unknown> {
    const organizationId = request.user.orgId;
    if (!organizationId) {
      return { success: false };
    }

    const latitude = dto.latitude ?? dto.lat;
    const longitude = dto.longitude ?? dto.lng;
    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException('latitude and longitude are required');
    }

    const canDispatch = canDispatchCourierUpdates(request.user.role);

    if (dto.courierId && !canDispatch) {
      throw new ForbiddenException('Only dispatchers and admins can update other couriers');
    }

    const courier = await this.prisma.courier.findFirst({
      where: {
        organizationId,
        ...(dto.courierId
          ? {
              id: dto.courierId,
            }
          : {
              userId: request.user.sub,
            }),
      },
      select: {
        id: true,
      },
    });

    if (!courier) {
      return { success: false };
    }

    const isOnline = dto.status ? dto.status === CourierRealtimeStatusDto.ONLINE : true;
    const updatedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.courier.update({
        where: { id: courier.id },
        data: {
          isOnline,
          lastLatitude: latitude,
          lastLongitude: longitude,
          lastUpdatedAt: updatedAt,
        },
      }),
      this.prisma.gPSLocation.create({
        data: {
          organizationId,
          courierId: courier.id,
          latitude,
          longitude,
          speedKph: dto.speed,
          heading: dto.heading,
        },
      }),
    ]);

    const payload = {
      courierId: courier.id,
      latitude,
      longitude,
      speed: dto.speed,
      heading: dto.heading,
      status: dto.status ?? (isOnline ? CourierRealtimeStatusDto.ONLINE : CourierRealtimeStatusDto.OFFLINE),
      organizationId,
      updatedAt: updatedAt.toISOString(),
    };

    this.realtime.emitCourierLocationUpdated(organizationId, payload);
    this.realtime.emitCourierStatusChanged(organizationId, payload);

    return { success: true, data: payload };
  }
}
