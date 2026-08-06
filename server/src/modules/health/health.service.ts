import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ClickhouseService } from '../../infrastructure/clickhouse/clickhouse.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

export type DependencyStatus = 'up' | 'down';

export interface HealthReport {
  status: 'ok' | 'degraded';
  dependencies: {
    mongo: DependencyStatus;
    clickhouse: DependencyStatus;
    redis: DependencyStatus;
  };
}

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly clickhouse: ClickhouseService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthReport> {
    const [mongo, clickhouse, redis] = await Promise.all([
      this.checkMongo(),
      this.clickhouse.ping(),
      this.redis.ping(),
    ]);

    const allUp = mongo && clickhouse && redis;
    return {
      status: allUp ? 'ok' : 'degraded',
      dependencies: {
        mongo: mongo ? 'up' : 'down',
        clickhouse: clickhouse ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
      },
    };
  }

  private async checkMongo(): Promise<boolean> {
    try {
      const db = this.connection.db;
      if (!db) return false;
      await db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
