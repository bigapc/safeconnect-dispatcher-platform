import { z } from 'zod';

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().positive(),
  JWT_REFRESH_TTL: z.coerce.number().int().positive(),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  SOCKET_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1),
});

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SOCKET_URL: z.string().url(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
});

export type ServerEnvironment = z.infer<typeof ServerEnvSchema>;
export type ClientEnvironment = z.infer<typeof ClientEnvSchema>;

export const loadServerEnv = (input: NodeJS.ProcessEnv): ServerEnvironment => {
  return ServerEnvSchema.parse(input);
};

export const loadClientEnv = (input: NodeJS.ProcessEnv): ClientEnvironment => {
  return ClientEnvSchema.parse(input);
};