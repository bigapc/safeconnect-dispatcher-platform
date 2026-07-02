import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@Req() request: { user: { sub: string } }) {
    return this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        status: true,
      },
    });
  }
}
