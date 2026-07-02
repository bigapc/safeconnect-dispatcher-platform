import { AuthController } from '@/auth/auth.controller';

describe('AuthController', () => {
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    logout: jest.fn(),
  };

  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as { cookie: jest.Mock; clearCookie: jest.Mock };

  const controller = new AuthController(authService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns access token on login', async () => {
    authService.login.mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

    const result = await controller.login({ email: 'a@b.com', password: 'secretpass' }, response as never);

    expect(result).toEqual({ accessToken: 'access-token' });
    expect(response.cookie).toHaveBeenCalledTimes(1);
  });

  it('registers user and returns verification token', async () => {
    authService.register.mockResolvedValue({ userId: 'u1', emailVerificationToken: 'token' });

    const result = await controller.register({
      email: 'new@safeconnect.dev',
      password: 'StrongPass123!',
      firstName: 'New',
      lastName: 'User',
      organizationName: 'Acme',
    });

    expect(result).toEqual({ userId: 'u1', emailVerificationToken: 'token' });
  });
});
