import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/safeconnect'),
  JWT_ACCESS_SECRET: z.string().min(16).default('safeconnect-access-secret-dev'),
  JWT_REFRESH_SECRET: z.string().min(16).default('safeconnect-refresh-secret-dev'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1209600),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),
});

export type Environment = z.infer<typeof EnvSchema>;

export const loadEnvironment = (): Environment => {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
};
