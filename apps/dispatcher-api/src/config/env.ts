import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().positive(),
  JWT_REFRESH_TTL: z.coerce.number().int().positive(),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOG_ARCHIVE_DIR: z.string().min(1).default('/tmp/safeconnect-log-archive'),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  SUPABASE_URL: z.string().url(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1),
});

export type Environment = z.infer<typeof EnvSchema>;

const preloadEnvironmentFiles = (): void => {
  const mode = process.env.NODE_ENV ?? 'development';
  const candidates = [
    resolve(process.cwd(), `.env.${mode}`),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', `.env.${mode}`),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', `.env.${mode}`),
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(process.cwd(), 'apps/dispatcher-api', `.env.${mode}`),
    resolve(process.cwd(), 'apps/dispatcher-api', '.env'),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }

    try {
      process.loadEnvFile(filePath);
    } catch {
      // Ignore malformed or unreadable env files here; schema validation reports final errors.
    }
  }
};

export const loadEnvironment = (): Environment => {
  preloadEnvironmentFiles();
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
};
