import { z } from 'zod';

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/safeconnect'),
  JWT_ACCESS_SECRET: z.string().min(16).default('safeconnect-access-secret-dev'),
  JWT_REFRESH_SECRET: z.string().min(16).default('safeconnect-refresh-secret-dev'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1209600),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),
  SOCKET_URL: z.string().url().default('http://localhost:3001/dispatch'),
});

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
});

export type ServerEnvironment = z.infer<typeof ServerEnvSchema>;
export type ClientEnvironment = z.infer<typeof ClientEnvSchema>;

export const loadServerEnv = (input: NodeJS.ProcessEnv): ServerEnvironment => {
  return ServerEnvSchema.parse(input);
};

export const loadClientEnv = (input: NodeJS.ProcessEnv): ClientEnvironment => {
  return ClientEnvSchema.parse(input);
};