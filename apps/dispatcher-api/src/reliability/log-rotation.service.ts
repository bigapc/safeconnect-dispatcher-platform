import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from './logger.service';

@Injectable()
export class LogRotationService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.rotateAndCleanup();
    }, 60 * 60 * 1000);

    void this.rotateAndCleanup();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async rotateAndCleanup(): Promise<void> {
    try {
      const retentionDays = this.configService.get<number>('LOG_RETENTION_DAYS', 30);
      const archiveDir = this.configService.get<string>('LOG_ARCHIVE_DIR', '/tmp/safeconnect-log-archive');

      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const staleLogs = await this.prisma.systemLog.findMany({
        where: {
          createdAt: {
            lt: cutoff,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 1000,
      });

      if (staleLogs.length === 0) {
        return;
      }

      await mkdir(archiveDir, { recursive: true });

      const archiveFile = join(archiveDir, `system-log-archive-${new Date().toISOString().slice(0, 10)}.jsonl`);
      const content = staleLogs
        .map((entry) => JSON.stringify(entry))
        .join('\n')
        .concat('\n');

      await appendFile(archiveFile, content, 'utf8');

      await this.prisma.systemLog.deleteMany({
        where: {
          id: {
            in: staleLogs.map((log) => log.id),
          },
        },
      });

      await this.logger.info(`Archived and cleaned ${staleLogs.length} system logs`, {
        request: {
          path: 'system-log-rotation',
          method: 'MAINTENANCE',
          ip: 'internal',
        },
      });
    } catch (error) {
      await this.logger.warn(`Log rotation skipped: ${String(error)}`, {
        request: {
          path: 'system-log-rotation',
          method: 'MAINTENANCE',
          ip: 'internal',
        },
      });
    }
  }
}
