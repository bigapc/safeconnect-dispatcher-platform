import { AppController } from '@/app.controller';

describe('AppController', () => {
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'REDIS_URL') {
        return 'redis://localhost:6379';
      }

      if (key === 'SUPABASE_URL') {
        return 'https://example.supabase.co';
      }

      if (key === 'METRICS_ENABLED') {
        return true;
      }

      return fallback;
    }),
  };

  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  const realtime = {
    server: {},
  };

  const controller = new AppController(configService as never, prisma as never, realtime as never);

  it('returns metrics payload', async () => {
    const metrics = await controller.metrics();
    expect(metrics).toMatchObject({
      service: 'dispatcher-api',
      metricsEnabled: true,
    });
  });
});
