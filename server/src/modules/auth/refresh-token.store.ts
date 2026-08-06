import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../../infrastructure/redis/redis.service';

/**
 * Refresh tokens live in Redis as `refresh:{userId}:{jti} -> sha256(token)`.
 * Consuming a token deletes the key atomically (GETDEL), which makes refresh
 * single-use: replaying the same token yields 401.
 */
@Injectable()
export class RefreshTokenStore {
  constructor(private readonly redis: RedisService) {}

  private key(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async remember(userId: string, jti: string, token: string, ttlSeconds: number): Promise<void> {
    await this.redis.setEx(this.key(userId, jti), this.hash(token), ttlSeconds);
  }

  /** Returns true only for the first use of a given token. */
  async consume(userId: string, jti: string, token: string): Promise<boolean> {
    const stored = await this.redis.getDel(this.key(userId, jti));
    return stored !== null && stored === this.hash(token);
  }

  async revoke(userId: string, jti: string): Promise<void> {
    await this.redis.del(this.key(userId, jti));
  }
}
