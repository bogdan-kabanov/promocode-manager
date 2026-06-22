import { Injectable, Logger } from '@nestjs/common';
import { ClickhouseService } from '../../../infrastructure/clickhouse/clickhouse.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { PromoCodeEntity } from '../application/ports/promocode.write-repository';
import {
  PromoCodeSyncPort,
  RedemptionRecord,
} from '../application/ports/promocode.sync.port';
import { ANALYTICS_CACHE_PREFIX } from '../application/queries/cache-keys';

function chDate(date: Date | null): string | null {
  return date ? new Date(date).toISOString().replace('T', ' ').replace('Z', '') : null;
}

@Injectable()
export class PromoCodeSyncService implements PromoCodeSyncPort {
  private readonly logger = new Logger(PromoCodeSyncService.name);

  constructor(
    private readonly clickhouse: ClickhouseService,
    private readonly redis: RedisService,
  ) {}

  private row(entity: PromoCodeEntity, deleted: number) {
    return {
      id: entity.id,
      code: entity.code,
      description: entity.description ?? '',
      discount_type: entity.discountType,
      discount_value: entity.discountValue,
      max_usages: entity.maxUsages,
      used_count: entity.usedCount,
      status: entity.status,
      starts_at: chDate(entity.startsAt),
      expires_at: chDate(entity.expiresAt),
      created_at: chDate(entity.createdAt),
      updated_at: chDate(entity.updatedAt),
      version: entity.version,
      deleted,
    };
  }

  async upsert(entity: PromoCodeEntity): Promise<void> {
    await this.clickhouse.insert('promocodes', [this.row(entity, 0)]);
    await this.invalidateAnalytics();
  }

  async markDeleted(entity: PromoCodeEntity): Promise<void> {
    await this.clickhouse.insert('promocodes', [
      this.row({ ...entity, version: entity.version + 1 }, 1),
    ]);
    await this.invalidateAnalytics();
  }

  async recordRedemption(record: RedemptionRecord): Promise<void> {
    await this.clickhouse.insert('redemptions', [
      {
        id: record.id,
        promocode_id: record.promocodeId,
        code: record.code,
        amount: record.amount,
        redeemed_at: chDate(record.redeemedAt),
      },
    ]);
    await this.invalidateAnalytics();
  }

  private async invalidateAnalytics(): Promise<void> {
    await this.redis.delByPrefix(ANALYTICS_CACHE_PREFIX);
  }
}
