import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RateLimit } from '@/reliability/rate-limit.decorator';
import { AiDispatchService } from './ai-dispatch.service';

interface JwtRequestUser {
  sub: string;
  orgId: string | null;
  role: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
@RateLimit('moderate')
export class AiDispatchController {
  constructor(private readonly aiDispatchService: AiDispatchService) {}

  @Get('recommend-courier')
  async recommendCourier(
    @Req() request: { user: JwtRequestUser },
    @Query('assignmentId') assignmentId?: string,
  ): Promise<unknown> {
    if (!assignmentId) {
      throw new BadRequestException('assignmentId query parameter is required');
    }

    return this.aiDispatchService.recommendCourierForAssignment(request.user, assignmentId);
  }
}
