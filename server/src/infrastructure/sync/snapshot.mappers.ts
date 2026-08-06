import { toClickhouseDateTime, toClickhouseDateTimeOrNull } from '../../common/datetime';
import { CLICKHOUSE_TABLES, ClickhouseTable } from '../clickhouse/clickhouse.schema';
import { phoneToDigits } from '../../common/phone';
import {
  OUTBOX_ENTITY,
  OrderSnapshot,
  OutboxEntityType,
  PromoUsageSnapshot,
  PromocodeSnapshot,
  UserSnapshot,
} from '../outbox/outbox.types';

/** Mongo stores dates as `Date`; a JSON round trip can turn them into strings. */
function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(String(value));
}

function asDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  return asDate(value);
}

function asNumberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

export function tableForEntity(entityType: OutboxEntityType): ClickhouseTable {
  switch (entityType) {
    case OUTBOX_ENTITY.user:
      return CLICKHOUSE_TABLES.users;
    case OUTBOX_ENTITY.promocode:
      return CLICKHOUSE_TABLES.promocodes;
    case OUTBOX_ENTITY.order:
      return CLICKHOUSE_TABLES.orders;
    case OUTBOX_ENTITY.promoUsage:
      return CLICKHOUSE_TABLES.promoUsages;
    default:
      return CLICKHOUSE_TABLES.users;
  }
}

export function mapSnapshotToRow(
  entityType: OutboxEntityType,
  payload: Record<string, unknown>,
  version: number,
): Record<string, unknown> {
  switch (entityType) {
    case OUTBOX_ENTITY.user: {
      const snapshot = payload as unknown as UserSnapshot;
      return {
        mongo_id: snapshot.mongoId,
        phone: snapshot.phone,
        phone_digits: phoneToDigits(snapshot.phone),
        name: snapshot.name,
        is_active: snapshot.isActive ? 1 : 0,
        created_at: toClickhouseDateTime(asDate(snapshot.createdAt)),
        updated_at: toClickhouseDateTime(asDate(snapshot.updatedAt)),
        version,
      };
    }
    case OUTBOX_ENTITY.promocode: {
      const snapshot = payload as unknown as PromocodeSnapshot;
      return {
        mongo_id: snapshot.mongoId,
        code: snapshot.code,
        discount_percent: snapshot.discountPercent,
        max_usages_total: asNumberOrNull(snapshot.maxUsagesTotal),
        max_usages_per_user: asNumberOrNull(snapshot.maxUsagesPerUser),
        valid_from: toClickhouseDateTimeOrNull(asDateOrNull(snapshot.validFrom)),
        valid_until: toClickhouseDateTimeOrNull(asDateOrNull(snapshot.validUntil)),
        is_active: snapshot.isActive ? 1 : 0,
        used_count: snapshot.usedCount,
        created_at: toClickhouseDateTime(asDate(snapshot.createdAt)),
        updated_at: toClickhouseDateTime(asDate(snapshot.updatedAt)),
        version,
      };
    }
    case OUTBOX_ENTITY.order: {
      const snapshot = payload as unknown as OrderSnapshot;
      return {
        mongo_id: snapshot.mongoId,
        mongo_user_id: snapshot.mongoUserId,
        user_name: snapshot.userName,
        user_phone: snapshot.userPhone,
        amount: snapshot.amount,
        mongo_promocode_id: snapshot.mongoPromocodeId ?? null,
        promocode_code: snapshot.promocodeCode ?? null,
        discount_amount: asNumberOrNull(snapshot.discountAmount),
        final_amount: snapshot.finalAmount,
        created_at: toClickhouseDateTime(asDate(snapshot.createdAt)),
        updated_at: toClickhouseDateTime(asDate(snapshot.updatedAt)),
        version,
      };
    }
    case OUTBOX_ENTITY.promoUsage:
    default: {
      const snapshot = payload as unknown as PromoUsageSnapshot;
      return {
        mongo_id: snapshot.mongoId,
        mongo_promocode_id: snapshot.mongoPromocodeId,
        promocode_code: snapshot.promocodeCode,
        mongo_user_id: snapshot.mongoUserId,
        user_name: snapshot.userName,
        user_phone: snapshot.userPhone,
        user_phone_digits: phoneToDigits(snapshot.userPhone),
        mongo_order_id: snapshot.mongoOrderId,
        order_amount: snapshot.orderAmount,
        discount_amount: snapshot.discountAmount,
        used_at: toClickhouseDateTime(asDate(snapshot.usedAt)),
        version,
      };
    }
  }
}
