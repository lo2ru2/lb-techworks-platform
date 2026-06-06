import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../cache/redis.service';
import { RATE_LIMIT_KEY } from './rate-limit.constants';
import type { RateLimitOpts } from './rate-limit.constants';

function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xf) ? xf[0] : xf?.split(',')[0]?.trim();
  if (raw) return raw;
  return req.socket?.remoteAddress ?? 'unknown';
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<RateLimitOpts>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? { limit: 40, windowSec: 60 };

    const req = context.switchToHttp().getRequest<Request>();
    const ip = clientIp(req);
    const key = `rl:${context.getClass().name}:${context.getHandler().name}:${ip}`;

    const ok = await this.redis.checkRateLimit(key, opts.windowSec, opts.limit);
    if (!ok) {
      throw new HttpException('Shumë kërkesa. Provo përsëri më vonë.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
