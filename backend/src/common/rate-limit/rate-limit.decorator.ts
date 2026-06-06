import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, type RateLimitOpts } from './rate-limit.constants';

export const RateLimit = (limit: number, windowSec: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSec } satisfies RateLimitOpts);
