import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { APP_CONFIG, AppConfig } from '../../config/configuration';
import { RedisService } from './redis.service';

/**
 * Redis scenario #1 — distributed mutual exclusion while a promo code is being
 * applied.
 *
 *   key      lock:promocode:{CODE}
 *   acquire  SET key <token> NX PX <ttlMs>   (default TTL 10 000 ms — a crashed
 *            holder releases the lock automatically)
 *   wait     poll every `retryDelayMs` for up to `waitMs` (default 5 000 ms)
 *   release  compare-and-delete via Lua, so a request can never release a lock
 *            that Redis already handed to somebody else
 */

const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

export interface AcquiredLock {
  key: string;
  token: string;
}

@Injectable()
export class LockService {
  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  promocodeLockKey(code: string): string {
    return `lock:promocode:${code}`;
  }

  /** Returns `null` when the lock could not be taken within the wait window. */
  async acquire(key: string): Promise<AcquiredLock | null> {
    const token = randomUUID();
    const deadline = Date.now() + this.config.lock.waitMs;

    for (;;) {
      const result = await this.redis.raw.set(key, token, 'PX', this.config.lock.ttlMs, 'NX');
      if (result === 'OK') return { key, token };
      if (Date.now() >= deadline) return null;
      await new Promise((resolve) => setTimeout(resolve, this.config.lock.retryDelayMs));
    }
  }

  async release(lock: AcquiredLock): Promise<void> {
    await this.redis.raw.eval(RELEASE_SCRIPT, 1, lock.key, lock.token);
  }

  async withLock<T>(key: string, handler: () => Promise<T>): Promise<T | null> {
    const lock = await this.acquire(key);
    if (!lock) return null;
    try {
      return await handler();
    } finally {
      await this.release(lock);
    }
  }
}
