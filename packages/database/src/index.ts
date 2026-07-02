import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
});

export const validateDatabaseEnv = (): void => {
  EnvSchema.parse(process.env);
};

export const prisma = new PrismaClient();

export const AssignmentStatusSchema = z.enum([
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const AssignmentPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;
export type AssignmentPriority = z.infer<typeof AssignmentPrioritySchema>;
