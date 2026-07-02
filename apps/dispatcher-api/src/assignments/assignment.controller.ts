import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { RateLimit } from '@/reliability/rate-limit.decorator';
import { AssignmentService } from './assignment.service';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

@Controller('assignments')
@UseGuards(JwtAuthGuard)
@RateLimit('moderate')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('create')
  async create(@Req() request: { user: JwtRequestUser }, @Body() dto: CreateAssignmentDto): Promise<unknown> {
    return this.assignmentService.createAssignment(request.user, dto);
  }

  @Get()
  async list(
    @Req() request: { user: JwtRequestUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<unknown> {
    const paginated = await this.assignmentService.getAssignmentsByOrg(request.user, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      priority,
      sortBy,
      sortOrder,
    });

    const wantsExtendedResponse = Boolean(page || limit || status || priority || sortBy || sortOrder);
    return wantsExtendedResponse ? paginated : paginated.data;
  }

  @Get('couriers')
  async listCouriers(
    @Req() request: { user: JwtRequestUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('onlineOnly') onlineOnly?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<unknown> {
    const paginated = await this.assignmentService.listCouriers(request.user, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      onlineOnly: onlineOnly === 'true',
      sortOrder,
    });

    const wantsExtendedResponse = Boolean(page || limit || onlineOnly || sortOrder);
    return wantsExtendedResponse ? paginated : paginated.data;
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('Dispatcher', 'OrganizationAdmin', 'SuperAdmin', 'Admin')
  async assign(
    @Req() request: { user: JwtRequestUser },
    @Param('id') id: string,
    @Body() dto: AssignCourierDto,
  ): Promise<unknown> {
    return this.assignmentService.assignCourier(request.user, id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() request: { user: JwtRequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ): Promise<unknown> {
    return this.assignmentService.updateStatus(request.user, id, dto);
  }
}
