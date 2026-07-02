import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerService } from './logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { user?: { sub?: string; orgId?: string | null } }>();
    const response = context.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const message = this.extractMessage(responseBody);
    const stackTrace = exception instanceof Error ? exception.stack : undefined;

    await this.logger.error('Unhandled API exception', {
      userId: request.user?.sub ?? null,
      organizationId: request.user?.orgId ?? null,
      request: {
        path: request.originalUrl,
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        requestId: this.requestId(request),
      },
      stackTrace,
    });

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        method: request.method,
        requestId: this.requestId(request),
        ...(process.env.NODE_ENV !== 'production' && stackTrace ? { stackTrace } : {}),
      },
    });
  }

  private extractMessage(value: unknown): string | string[] {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      const candidate = value as { message?: unknown };
      if (typeof candidate.message === 'string' || Array.isArray(candidate.message)) {
        return candidate.message as string | string[];
      }
    }

    return 'Internal server error';
  }

  private requestId(request: Request): string | undefined {
    const header = request.headers['x-request-id'];
    return typeof header === 'string' ? header : undefined;
  }
}
