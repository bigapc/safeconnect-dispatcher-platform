import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggerService } from './logger.service';
import { RATE_LIMIT_PROFILE_KEY, type RateLimitProfile } from './rate-limit.decorator';

interface BucketState {
  count: number;
  resetAt: number;
}

interface RequestWithUser {
  ip?: string;
  method?: string;
  originalUrl?: string;
  route?: { path?: string };
  headers?: Record<string, string | string[] | undefined>;
  user?: { orgId?: string | null; sub?: string };
}

const WINDOW_MS = 60_000;

const PROFILE_RULES: Record<RateLimitProfile, { ipEndpoint: number; orgEndpoint: number }> = {
  strict: { ipEndpoint: 20, orgEndpoint: 60 },
  moderate: { ipEndpoint: 100, orgEndpoint: 240 },
  light: { ipEndpoint: 300, orgEndpoint: 600 },
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, BucketState>();

  constructor(
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const path = request.route?.path ?? request.originalUrl ?? '/';
    const method = request.method ?? 'GET';
    const ip = request.ip ?? 'unknown';
    const endpoint = `${method}:${path}`;
    const profile = this.resolveProfile(context, path);
    const orgId = request.user?.orgId ?? this.orgFromHeaders(request.headers);

    this.enforce('ip:global', ip, 500);
    this.enforce(`ip:endpoint:${endpoint}`, ip, PROFILE_RULES[profile].ipEndpoint);

    if (orgId) {
      this.enforce(`org:endpoint:${endpoint}`, orgId, PROFILE_RULES[profile].orgEndpoint);
      this.enforce('org:global', orgId, 1000);
    }

    return true;
  }

  private enforce(scope: string, value: string, limit: number): void {
    const now = Date.now();
    const key = `${scope}:${value}`;
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + WINDOW_MS,
      });
      this.cleanup(now);
      return;
    }

    if (bucket.count >= limit) {
      void this.logger.warn('Rate limit exceeded', {
        request: {
          path: scope,
          method: 'RATE_LIMIT',
          ip: value,
        },
      });

      throw new HttpException({
        message: 'Rate limit exceeded. Please retry later.',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);
  }

  private resolveProfile(context: ExecutionContext, path: string): RateLimitProfile {
    const metadataProfile = this.reflector.getAllAndOverride<RateLimitProfile>(RATE_LIMIT_PROFILE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (metadataProfile) {
      return metadataProfile;
    }

    if (path.startsWith('/auth')) {
      return 'strict';
    }

    if (path.startsWith('/dashboard')) {
      return 'light';
    }

    return 'moderate';
  }

  private orgFromHeaders(headers?: Record<string, string | string[] | undefined>): string | null {
    if (!headers) {
      return null;
    }

    const raw = headers['x-organization-id'];
    if (typeof raw === 'string') {
      return raw;
    }

    return null;
  }

  private cleanup(now: number): void {
    if (this.buckets.size < 2_000) {
      return;
    }

    for (const [key, state] of this.buckets.entries()) {
      if (state.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
