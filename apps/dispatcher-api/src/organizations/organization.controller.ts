import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('limit') limit = '25') {
    const take = Number.parseInt(limit, 10);

    return this.prisma.organization.findMany({
      take: Number.isNaN(take) ? 25 : Math.min(take, 100),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
