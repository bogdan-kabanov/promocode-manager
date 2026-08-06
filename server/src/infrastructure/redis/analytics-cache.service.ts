import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { APP_CONFIG, AppConfig } from '../../config/configuration';
import { RedisService } from './redis.service';

/**
 * Redis scenario #2 — short-lived cache of analytics list responses.
 *
 *   key      cache:analytics:{endpoint}:{sha1(query + viewer)}
 *   ttl      ANALYTICS_CACHE_TTL_SECONDS (default 5 s)
 *   invalidation  the outbox worker drops `cache:analytics:*` after every batch
 *                 it replicates into ClickHouse
 *
 * Availability rule from the assignment: the caller MUST probe ClickHouse
 * before answering from the cache, so a ClickHouse outage returns 503 even
 * when a fresh cache entry exists. See `AnalyticsQueryService`.
 */
export const ANALYTICS_CACHE_PREFIX = 'cache:analytics:';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);

  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  buildKey(endpoint: string, payload: unknown): string {
    const hash = createHash('sha1').update(JSON.stringify(payload)).digest('hex');
    return `${ANALYTICS_CACHE_PREFIX}${endpoint}:${hash}`;
  }

  async read<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      this.logger.warn(`Analytics cache read failed: ${(error as Error).message}`);
      return null;
    }
  }

  async write(key: string, value: unknown): Promise<void> {
    try {
      await this.redis.setEx(key, JSON.stringify(value), this.config.cache.analyticsTtlSeconds);
    } catch (error) {
      this.logger.warn(`Analytics cache write failed: ${(error as Error).message}`);
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      await this.redis.deleteByPattern(`${ANALYTICS_CACHE_PREFIX}*`);
    } catch (error) {
      this.logger.warn(`Analytics cache invalidation failed: ${(error as Error).message}`);
    }
  }
}
