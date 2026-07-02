import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async overview(@Query('organizationId') organizationId?: string) {
    const where = organizationId ? { organizationId } : undefined;

    const [activeAssignments, assignedAssignments, completedAssignments, pendingAssignments] =
      await Promise.all([
        this.prisma.assignment.count({
          where: {
            ...where,
            status: {
              in: ['ASSIGNED', 'IN_PROGRESS'],
            },
          },
        }),
        this.prisma.assignment.count({
          where: {
            ...where,
            status: 'ASSIGNED',
          },
        }),
        this.prisma.assignment.count({
          where: {
            ...where,
            status: 'COMPLETED',
          },
        }),
        this.prisma.assignment.count({
          where: {
            ...where,
            status: 'PENDING',
          },
        }),
      ]);

    return {
      activeAssignments,
      assignedAssignments,
      completedAssignments,
      pendingAssignments,
    };
  }
}
