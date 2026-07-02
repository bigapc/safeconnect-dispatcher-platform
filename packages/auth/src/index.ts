import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  orgId: z.string().uuid().nullable(),
  role: z.string(),
  permissions: z.array(z.string()),
  tokenType: z.enum(['access', 'refresh']),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateJwt = (
  payload: Omit<JwtPayload, 'tokenType'> & { tokenType: 'access' | 'refresh' },
  secret: string,
  expiresInSeconds: number,
): string => {
  return jwt.sign(payload, secret, { expiresIn: expiresInSeconds });
};

export const verifyJwt = (token: string, secret: string): JwtPayload => {
  const result = jwt.verify(token, secret);
  return JwtPayloadSchema.parse(result);
};

export const hasAnyRole = (role: string, allowedRoles: string[]): boolean => {
  return allowedRoles.some((allowedRole) => allowedRole.toLowerCase() === role.toLowerCase());
};

export const canAssignCourier = (role: string): boolean => {
  return hasAnyRole(role, ['Dispatcher', 'Admin', 'OrganizationAdmin', 'SuperAdmin']);
};
