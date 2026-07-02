import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';
import { LoggerService } from './logger.service';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      originalUrl?: string;
      method?: string;
      ip?: string;
      user?: { sub?: string; orgId?: string | null };
    }>();

    return next.handle().pipe(
      timeout(12_000),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          void this.logger.warn('Request timed out', {
            userId: request.user?.sub ?? null,
            organizationId: request.user?.orgId ?? null,
            request: {
              path: request.originalUrl,
              method: request.method,
              ip: request.ip,
            },
          });

          return throwError(() => new RequestTimeoutException('Request timed out'));
        }

        return throwError(() => error);
      }),
    );
  }
}
