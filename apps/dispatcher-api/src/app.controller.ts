import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import net from 'node:net';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';

@Controller()
export class AppController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get('health')
  async health(@Res({ passthrough: true }) response: Response) {
    const checks = await this.collectChecks();
    const allHealthy = checks.database && checks.redis && checks.socket && checks.storage;
    response.status(allHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      service: 'dispatcher-api',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const checks = await this.collectChecks();
    const ready = checks.database && checks.redis && checks.socket && checks.storage;
    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  async metrics() {
    const checks = await this.collectChecks();
    const memory = process.memoryUsage();

    return {
      service: 'dispatcher-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      metricsEnabled: this.configService.get<boolean>('METRICS_ENABLED', true),
      dependencies: checks,
      memory: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        externalBytes: memory.external,
      },
    };
  }

  private async collectChecks(): Promise<{
    database: boolean;
    redis: boolean;
    socket: boolean;
    storage: boolean;
  }> {
    const [database, redis, socket, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      Promise.resolve(this.checkSocketService()),
      this.checkStorage(),
    ]);

    return { database, redis, socket, storage };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2500)),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return false;
    }

    try {
      const parsed = new URL(redisUrl);
      const host = parsed.hostname;
      const port = Number(parsed.port || 6379);

      return await new Promise<boolean>((resolve) => {
        const socket = net.createConnection({ host, port });

        const done = (value: boolean): void => {
          socket.removeAllListeners();
          socket.destroy();
          resolve(value);
        };

        socket.setTimeout(2500);
        socket.on('connect', () => {
          socket.write('PING\r\n');
        });
        socket.on('data', (data: Buffer) => {
          done(data.toString().includes('PONG'));
        });
        socket.on('timeout', () => done(false));
        socket.on('error', () => done(false));
      });
    } catch {
      return false;
    }
  }

  private checkSocketService(): boolean {
    return Boolean(this.realtime.server);
  }

  private async checkStorage(): Promise<boolean> {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(supabaseUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);
      return response.status < 500;
    } catch {
      return false;
    }
  }
}
