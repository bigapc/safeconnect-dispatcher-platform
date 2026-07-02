import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiDispatchService } from '@/ai-dispatch/ai-dispatch.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { AssignmentStatusDto, UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

interface AssignmentCourierView {
  id: string;
  name: string;
  isOnline: boolean;
}

const canAssignCourier = (role: string): boolean => {
  return ['dispatcher', 'admin', 'organizationadmin', 'superadmin'].includes(role.toLowerCase());
};

@Injectable()
export class AssignmentService {
  constructor(
    private readonly aiDispatchService: AiDispatchService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async createAssignment(user: JwtRequestUser, dto: CreateAssignmentDto): Promise<unknown> {
    const organizationId = this.requireOrganization(user);

    if (dto.courierId) {
      await this.ensureCourierInOrganization(dto.courierId, organizationId);
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description,
        pickupAddress: dto.pickupAddress,
        pickupLatitude: dto.pickupLatitude,
        pickupLongitude: dto.pickupLongitude,
        dropoffAddress: dto.dropoffAddress,
        dropoffLatitude: dto.dropoffLatitude,
        dropoffLongitude: dto.dropoffLongitude,
        priority: dto.priority,
        status: dto.courierId ? 'ASSIGNED' : 'PENDING',
        organizationId,
        courierId: dto.courierId,
      },
      include: {
        courier: {
          select: {
            id: true,
            isOnline: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const formatted = this.formatAssignment(assignment);
    this.realtime.emitAssignmentCreated(organizationId, formatted);

    const recommendationResult = await this.aiDispatchService.recommendCourierForAssignment(user, assignment.id);

    return {
      ...formatted,
      aiRecommendations: recommendationResult.recommendations,
      aiRecommendedCourier: recommendationResult.recommendedCourier,
      aiMessage: recommendationResult.message,
    };
  }

  async getAssignmentsByOrg(user: JwtRequestUser) {
    const organizationId = this.requireOrganization(user);

    const assignments = await this.prisma.assignment.findMany({
      where: {
        organizationId,
      },
      include: {
        courier: {
          select: {
            id: true,
            isOnline: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assignments.map((assignment) => this.formatAssignment(assignment));
  }

  async assignCourier(user: JwtRequestUser, assignmentId: string, dto: AssignCourierDto) {
    const organizationId = this.requireOrganization(user);

    if (!canAssignCourier(user.role)) {
      throw new ForbiddenException('Only dispatchers and admins can assign couriers');
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        organizationId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot assign a completed assignment');
    }

    await this.ensureCourierInOrganization(dto.courierId, organizationId);

    const updated = await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        courierId: dto.courierId,
        status: assignment.status === 'PENDING' ? 'ASSIGNED' : assignment.status,
      },
      include: {
        courier: {
          select: {
            id: true,
            isOnline: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const formatted = this.formatAssignment(updated);
    this.realtime.emitAssignmentAssigned(organizationId, formatted);
    return formatted;
  }

  async updateStatus(user: JwtRequestUser, assignmentId: string, dto: UpdateAssignmentStatusDto) {
    const organizationId = this.requireOrganization(user);

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        organizationId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    this.ensureValidStatusTransition(assignment.status as AssignmentStatusDto, dto.status);

    const updated = await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: dto.status,
      },
      include: {
        courier: {
          select: {
            id: true,
            isOnline: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const formatted = this.formatAssignment(updated);

    this.realtime.emitAssignmentUpdated(organizationId, formatted);
    this.realtime.emitAssignmentStatusChanged(organizationId, formatted);
    if (updated.status === AssignmentStatusDto.COMPLETED) {
      this.realtime.emitAssignmentCompleted(organizationId, formatted);
    }

    return formatted;
  }

  async listCouriers(user: JwtRequestUser) {
    const organizationId = this.requireOrganization(user);

    const couriers = await this.prisma.courier.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        isOnline: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });

    return couriers.map((courier) => ({
      id: courier.id,
      name: `${courier.user.firstName} ${courier.user.lastName}`.trim(),
      isOnline: courier.isOnline,
    }));
  }

  private requireOrganization(user: JwtRequestUser): string {
    if (!user.orgId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.orgId;
  }

  private async ensureCourierInOrganization(courierId: string, organizationId: string): Promise<void> {
    const courier = await this.prisma.courier.findFirst({
      where: {
        id: courierId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!courier) {
      throw new BadRequestException('Courier not found in this organization');
    }
  }

  private ensureValidStatusTransition(current: AssignmentStatusDto, next: AssignmentStatusDto): void {
    if (current === 'COMPLETED' || current === 'CANCELLED') {
      throw new BadRequestException('Terminal assignments cannot change status');
    }

    const allowedTransitions: Record<AssignmentStatusDto, AssignmentStatusDto[]> = {
      [AssignmentStatusDto.PENDING]: [AssignmentStatusDto.ASSIGNED, AssignmentStatusDto.CANCELLED],
      [AssignmentStatusDto.ASSIGNED]: [AssignmentStatusDto.IN_PROGRESS, AssignmentStatusDto.CANCELLED],
      [AssignmentStatusDto.IN_PROGRESS]: [AssignmentStatusDto.COMPLETED, AssignmentStatusDto.CANCELLED],
      [AssignmentStatusDto.COMPLETED]: [],
      [AssignmentStatusDto.CANCELLED]: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(`Invalid status transition from ${current} to ${next}`);
    }
  }

  private formatAssignment(assignment: {
    id: string;
    title: string;
    description: string;
    pickupAddress: string | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    dropoffAddress: string | null;
    dropoffLatitude: number | null;
    dropoffLongitude: number | null;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
    courier: {
      id: string;
      isOnline: boolean;
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
  }): {
    id: string;
    title: string;
    description: string;
    pickupAddress: string | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    dropoffAddress: string | null;
    dropoffLatitude: number | null;
    dropoffLongitude: number | null;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
    courier: AssignmentCourierView | null;
  } {
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      pickupAddress: assignment.pickupAddress,
      pickupLatitude: assignment.pickupLatitude,
      pickupLongitude: assignment.pickupLongitude,
      dropoffAddress: assignment.dropoffAddress,
      dropoffLatitude: assignment.dropoffLatitude,
      dropoffLongitude: assignment.dropoffLongitude,
      status: assignment.status,
      priority: assignment.priority,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      courier: assignment.courier
        ? {
            id: assignment.courier.id,
            name: `${assignment.courier.user.firstName} ${assignment.courier.user.lastName}`.trim(),
            isOnline: assignment.courier.isOnline,
          }
        : null,
    };
  }
}
