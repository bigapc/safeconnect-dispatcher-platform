import { SetMetadata } from '@nestjs/common';

export type RateLimitProfile = 'strict' | 'moderate' | 'light';

export const RATE_LIMIT_PROFILE_KEY = 'rate_limit_profile';

export const RateLimit = (profile: RateLimitProfile) => SetMetadata(RATE_LIMIT_PROFILE_KEY, profile);
