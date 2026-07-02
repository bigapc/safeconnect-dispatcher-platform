import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '25',
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder = 'desc',
  ) {
    const requestedPagination = page !== '1' || limit !== '25' || Boolean(search) || Boolean(isActive) || sortBy !== 'createdAt' || sortOrder !== 'desc';
    const pageValue = Number.parseInt(page, 10);
    const limitValue = Number.parseInt(limit, 10);
    const currentPage = Number.isNaN(pageValue) || pageValue < 1 ? 1 : pageValue;
    const take = Number.isNaN(limitValue) ? 25 : Math.min(Math.max(limitValue, 1), 100);
    const skip = (currentPage - 1) * take;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(isActive === 'true' || isActive === 'false'
        ? {
            isActive: isActive === 'true',
          }
        : {}),
    };

    const sortField = sortBy === 'name' ? 'name' : 'createdAt';
    const direction = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, organizations] = await this.prisma.$transaction([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        take,
        skip,
        orderBy: { [sortField]: direction },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    const payload = {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.max(1, Math.ceil(total / take)),
      data: organizations,
    };

    return requestedPagination ? payload : payload.data;
  }
}
