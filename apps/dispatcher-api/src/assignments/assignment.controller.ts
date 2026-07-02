import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
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
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('create')
  async create(@Req() request: { user: JwtRequestUser }, @Body() dto: CreateAssignmentDto): Promise<unknown> {
    return this.assignmentService.createAssignment(request.user, dto);
  }

  @Get()
  async list(@Req() request: { user: JwtRequestUser }): Promise<unknown[]> {
    return this.assignmentService.getAssignmentsByOrg(request.user);
  }

  @Get('couriers')
  async listCouriers(@Req() request: { user: JwtRequestUser }): Promise<unknown[]> {
    return this.assignmentService.listCouriers(request.user);
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
