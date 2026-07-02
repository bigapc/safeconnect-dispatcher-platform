import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoggerService, type LogContext } from './logger.service';

interface EnqueueOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  context?: LogContext;
  onFailure?: (error: unknown, finalAttempt: boolean) => Promise<void>;
}

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  context?: LogContext;
}

interface QueuedJob {
  id: string;
  name: string;
  attempt: number;
  maxAttempts: number;
  nextRunAt: number;
  handler: () => Promise<void>;
  context?: LogContext;
  onFailure?: (error: unknown, finalAttempt: boolean) => Promise<void>;
}

@Injectable()
export class JobService implements OnModuleInit, OnModuleDestroy {
  private readonly queue: QueuedJob[] = [];
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly logger: LoggerService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.processDueJobs();
    }, 250);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  enqueue(name: string, handler: () => Promise<void>, options?: EnqueueOptions): string {
    const id = `${name}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

    this.queue.push({
      id,
      name,
      attempt: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      nextRunAt: Date.now() + (options?.initialDelayMs ?? 0),
      handler,
      context: options?.context,
      onFailure: options?.onFailure,
    });

    return id;
  }

  async runWithRetry<T>(name: string, handler: () => Promise<T>, options?: RetryOptions): Promise<T> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const initialDelayMs = options?.initialDelayMs ?? 500;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const result = await handler();
        if (attempt > 1) {
          await this.logger.info(`Retry succeeded: ${name} (attempt ${attempt}/${maxAttempts})`, options?.context);
        }

        return result;
      } catch (error) {
        const finalAttempt = attempt >= maxAttempts;
        if (finalAttempt) {
          await this.logger.error(`Retry failed: ${name} (attempt ${attempt}/${maxAttempts})`, {
            ...options?.context,
            stackTrace: error instanceof Error ? error.stack : String(error),
          });
          throw error;
        }

        await this.logger.warn(`Retrying operation: ${name} (attempt ${attempt}/${maxAttempts})`, {
          ...options?.context,
        });

        const backoffMs = initialDelayMs * Math.pow(2, attempt - 1);
        await this.delay(backoffMs);
      }
    }

    throw new Error(`Unexpected retry termination for ${name}`);
  }

  private async processDueJobs(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const now = Date.now();
      const index = this.queue.findIndex((job) => job.nextRunAt <= now);
      if (index === -1) {
        return;
      }

      const [job] = this.queue.splice(index, 1);
      if (!job) {
        return;
      }
      await this.runJob(job);
    } finally {
      this.running = false;
    }
  }

  private async runJob(job: QueuedJob): Promise<void> {
    try {
      await job.handler();
      await this.logger.info(`Job completed: ${job.name}`, job.context);
    } catch (error) {
      job.attempt += 1;
      const finalAttempt = job.attempt >= job.maxAttempts;

      if (job.onFailure) {
        await job.onFailure(error, finalAttempt);
      }

      if (finalAttempt) {
        await this.logger.error(`Job failed after retries: ${job.name}`, {
          ...job.context,
          stackTrace: error instanceof Error ? error.stack : String(error),
        });
        return;
      }

      const backoffMs = Math.pow(2, job.attempt) * 500;
      job.nextRunAt = Date.now() + backoffMs;
      this.queue.push(job);

      await this.logger.warn(`Job retry scheduled: ${job.name}`, {
        ...job.context,
        request: {
          path: 'job-queue',
          method: 'RETRY',
          ip: 'internal',
        },
      });
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), ms);
    });
  }
}
