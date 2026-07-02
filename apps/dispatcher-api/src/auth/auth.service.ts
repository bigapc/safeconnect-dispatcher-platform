import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { AuditService } from '@/audit/audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UserRepository } from '@/repositories/user.repository';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';
import type { JwtUser } from './jwt.strategy';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string; emailVerificationToken: string }> {
    const existing = await this.users.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = this.generateToken();

    const user = await this.users.create({
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      passwordHash,
      emailVerificationToken,
      organization: dto.organizationId ? { connect: { id: dto.organizationId } } : undefined,
    });

    await this.sendEmail({
      to: user.email,
      subject: 'Verify your SafeConnect account',
      html: `<p>Verify your email by using this token: <strong>${emailVerificationToken}</strong></p>`,
    });

    await this.auditService.record({
      action: 'auth.register',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId ?? undefined,
      metadata: { email: user.email },
    });

    return { userId: user.id, emailVerificationToken };
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Email not verified');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = 'Dispatcher';
    const permissions: string[] = [];

    const tokenPair = await this.signTokens({
      sub: user.id,
      orgId: user.organizationId,
      role,
      permissions,
    });

    await this.users.update(user.id, {
      lastLoginAt: new Date(),
      refreshTokenHash: await bcrypt.hash(tokenPair.refreshToken, 12),
    });

    await this.auditService.record({
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId ?? undefined,
    });

    return tokenPair;
  }

  async refresh(user: JwtUser, dto: RefreshTokenDto): Promise<TokenPair> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const dbUser = await this.users.findById(user.sub);
    if (!dbUser?.refreshTokenHash) {
      throw new UnauthorizedException('Session not found');
    }

    const refreshMatches = await bcrypt.compare(dto.refreshToken, dbUser.refreshTokenHash);
    if (!refreshMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenPair = await this.signTokens({
      sub: dbUser.id,
      orgId: dbUser.organizationId,
      role: user.role,
      permissions: user.permissions,
    });

    await this.users.update(dbUser.id, {
      refreshTokenHash: await bcrypt.hash(tokenPair.refreshToken, 12),
    });

    return tokenPair;
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.users.findByEmail(dto.email.toLowerCase());
    if (!user) {
      return;
    }

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.users.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpiresAt: expiresAt,
    });

    await this.sendEmail({
      to: user.email,
      subject: 'Reset your SafeConnect password',
      html: `<p>Use this reset token: <strong>${token}</strong>. It expires in 30 minutes.</p>`,
    });

    await this.auditService.record({
      action: 'auth.forgot-password',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId ?? undefined,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    await this.users.update(user.id, {
      passwordHash: await bcrypt.hash(dto.newPassword, 12),
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
      refreshTokenHash: null,
    });

    await this.auditService.record({
      action: 'auth.reset-password',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId ?? undefined,
    });
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: dto.token,
      },
    });

    if (!user) {
      throw new BadRequestException('Verification token is invalid');
    }

    await this.users.update(user.id, {
      emailVerificationToken: null,
      emailVerifiedAt: new Date(),
    });

    await this.auditService.record({
      action: 'auth.verify-email',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId ?? undefined,
    });
  }

  async logout(userId: string): Promise<void> {
    await this.users.update(userId, { refreshTokenHash: null });

    await this.auditService.record({
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
      userId,
    });
  }

  private async signTokens(payload: {
    sub: string;
    orgId: string | null;
    role: string;
    permissions: string[];
  }): Promise<TokenPair> {
    const accessTtl = this.configService.getOrThrow<number>('JWT_ACCESS_TTL');
    const refreshTtl = this.configService.getOrThrow<number>('JWT_REFRESH_TTL');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, tokenType: 'access' },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessTtl,
        },
      ),
      this.jwtService.signAsync(
        { ...payload, tokenType: 'refresh' },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshTtl,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async sendEmail(message: { to: string; subject: string; html: string }): Promise<void> {
    if (!message.to) {
      return;
    }
  }
}
