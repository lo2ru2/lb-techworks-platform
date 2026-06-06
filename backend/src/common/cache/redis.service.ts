import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.redis.on('error', () => {
      // Keep app alive even when Redis is temporarily down.
    });
  }

  private async safe<T>(cb: () => Promise<T>, fallback: T): Promise<T> {
    try {
      if (this.redis.status !== 'ready') await this.redis.connect();
      return await cb();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Redis bypass: ${msg}`);
      return fallback;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    return this.safe(async () => {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }, null);
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.safe(async () => {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    }, undefined);
  }

  async delByPrefix(prefix: string): Promise<void> {
    await this.safe(async () => {
      const stream = this.redis.scanStream({ match: `${prefix}*`, count: 100 });
      const keys: string[] = [];
      for await (const chunk of stream) {
        keys.push(...(chunk as string[]));
      }
      if (keys.length) await this.redis.del(...keys);
    }, undefined);
  }

  /**
   * Rate limit: INCR + EXPIRE në dritare fikse. Nëse Redis dështon, lejon kërkesën.
   * @returns true nëse kërkesa lejohet, false nëse u tejkalua limiti
   */
  async checkRateLimit(key: string, windowSec: number, limit: number): Promise<boolean> {
    return this.safe(async () => {
      const n = await this.redis.incr(key);
      if (n === 1) await this.redis.expire(key, windowSec);
      return n <= limit;
    }, true);
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch {
      // ignore
    }
  }
}
