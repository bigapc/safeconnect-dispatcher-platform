import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export type SystemLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface RequestLogMetadata {
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface LogContext {
  userId?: string | null;
  organizationId?: string | null;
  request?: RequestLogMetadata;
  stackTrace?: string;
}

@Injectable()
export class LoggerService {
  private readonly logger = new Logger(LoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async info(message: string, context?: LogContext): Promise<void> {
    await this.write('INFO', message, context);
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    await this.write('WARN', message, context);
  }

  async error(message: string, context?: LogContext): Promise<void> {
    await this.write('ERROR', message, context);
  }

  async debug(message: string, context?: LogContext): Promise<void> {
    await this.write('DEBUG', message, context);
  }

  private async write(level: SystemLogLevel, message: string, context?: LogContext): Promise<void> {
    const metadata = {
      timestamp: new Date().toISOString(),
      userId: context?.userId ?? null,
      organizationId: context?.organizationId ?? null,
      request: context?.request ?? null,
    };

    const formattedMessage = `${message} | meta=${JSON.stringify(metadata)}`;

    this.logToStdout(level, formattedMessage, context?.stackTrace);

    try {
      await this.prisma.systemLog.create({
        data: {
          level,
          message: formattedMessage,
          stackTrace: context?.stackTrace ?? null,
          organizationId: context?.organizationId ?? null,
          userId: context?.userId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist system log: ${String(error)}`);
    }
  }

  private logToStdout(level: SystemLogLevel, message: string, stackTrace?: string): void {
    if (level === 'ERROR') {
      this.logger.error(message, stackTrace);
      return;
    }

    if (level === 'WARN') {
      this.logger.warn(message);
      return;
    }

    if (level === 'DEBUG') {
      this.logger.debug(message);
      return;
    }

    this.logger.log(message);
  }
}
