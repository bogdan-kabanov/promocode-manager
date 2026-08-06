import { Injectable, Logger } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../../common/errors';
import { clickhouseDateToIso, clickhouseDateToIsoRequired } from '../../common/datetime';
import { ListResult, SortOrder } from '../../common/dto/list-request.dto';
import { phoneToDigits } from '../../common/phone';
import { ClickhouseService } from '../../infrastructure/clickhouse/clickhouse.service';
import { CLICKHOUSE_TABLES } from '../../infrastructure/clickhouse/clickhouse.schema';
import { PromocodeState } from '../promocodes/promocode-state';
import {
  AnalyticsPromocodeRow,
  AnalyticsPromocodesReadQuery,
  AnalyticsUsageRow,
  AnalyticsUsagesReadQuery,
  AnalyticsUserRow,
  AnalyticsUsersReadQuery,
  OrderReadRow,
  OrdersReadQuery,
  PromocodeReadRow,
  PromocodesReadQuery,
  UserReadRow,
  UsersReadQuery,
} from './read-model.types';

interface WithTotal {
  total_count: string;
}

function num(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function numOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function bool(value: unknown): boolean {
  return Number(value) === 1;
}

function direction(order: SortOrder): 'ASC' | 'DESC' {
  return order === 'asc' ? 'ASC' : 'DESC';
}

/** NULLs always sort last, ties are broken by `mongo_id` ascending. */
function orderBy(column: string, order: SortOrder, nullable = false, idColumn = 'mongo_id'): string {
  const nullsLast = nullable ? `isNull(${column}) ASC, ` : '';
  return `ORDER BY ${nullsLast}${column} ${direction(order)}, ${idColumn} ASC`;
}

/**
 * Promo state is derived in SQL exactly like `computePromocodeState()` does in
 * TypeScript: DISABLED > EXHAUSTED > EXPIRED > SCHEDULED > ACTIVE.
 */
function stateExpression(alias = ''): string {
  const p = alias ? `${alias}.` : '';
  return `multiIf(
    ${p}is_active = 0, 'DISABLED',
    ${p}max_usages_total IS NOT NULL AND ${p}used_count >= ${p}max_usages_total, 'EXHAUSTED',
    ${p}valid_until IS NOT NULL AND fromUnixTimestamp64Milli({nowMs:Int64}, 'UTC') >= ${p}valid_until, 'EXPIRED',
    ${p}valid_from IS NOT NULL AND fromUnixTimestamp64Milli({nowMs:Int64}, 'UTC') < ${p}valid_from, 'SCHEDULED',
    'ACTIVE')`;
}

/** Minimum number of digits before a search term is also matched against phones. */
const MIN_PHONE_SEARCH_DIGITS = 3;

/**
 * A search term is matched against the normalized phone only when it carries a
 * meaningful digit fragment; otherwise searching for `LIMIT3` would match every
 * phone containing a `3`.
 */
function digitsForSearch(search: string): string {
  const digits = phoneToDigits(search);
  return digits.length >= MIN_PHONE_SEARCH_DIGITS ? digits : '';
}

function totalOf(rows: WithTotal[]): number {
  return rows.length === 0 ? 0 : Number(rows[0]?.total_count ?? 0);
}

/**
 * THE single gateway to the ClickHouse read model.
 *
 * Domain services (users / promocodes / orders) never touch `ClickhouseService`;
 * they depend on this repository, which owns every analytical query, including
 * the `fetch/many` lists that are served from the denormalized tables.
 *
 * Any ClickHouse failure surfaces as 503 ANALYTICS_UNAVAILABLE.
 */
@Injectable()
export class AnalyticsReadRepository {
  private readonly logger = new Logger(AnalyticsReadRepository.name);

  constructor(private readonly clickhouse: ClickhouseService) {}

  get db(): string {
    return this.clickhouse.database;
  }

  async isAvailable(): Promise<boolean> {
    return this.clickhouse.ping();
  }

  private async run<T>(sql: string, params: Record<string, unknown>): Promise<T[]> {
    try {
      return await this.clickhouse.query<T>(sql, params);
    } catch (error) {
      this.logger.warn(`ClickHouse query failed: ${(error as Error).message}`);
      throw BusinessException.unavailable(ErrorCode.ANALYTICS_UNAVAILABLE);
    }
  }

  // ---------------------------------------------------------------- users ---

  async listUsers(query: UsersReadQuery): Promise<ListResult<UserReadRow>> {
    const column = { name: 'name', phone: 'phone', createdAt: 'created_at' }[query.sortBy];
    const sql = `
      SELECT mongo_id, phone, name, is_active, created_at, updated_at,
             count() OVER () AS total_count
      FROM ${this.db}.${CLICKHOUSE_TABLES.users} FINAL
      WHERE ({search:String} = ''
             OR positionCaseInsensitiveUTF8(name, {search:String}) > 0
             OR ({digits:String} != '' AND position(phone_digits, {digits:String}) > 0))
        AND ({isActive:Int8} = -1 OR is_active = toUInt8({isActive:Int8}))
      ${orderBy(column, query.sortOrder)}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const rows = await this.run<Record<string, unknown> & WithTotal>(sql, {
      search: query.search,
      digits: digitsForSearch(query.search),
      isActive: query.isActive === null ? -1 : query.isActive ? 1 : 0,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      data: rows.map((row) => ({
        mongoId: String(row['mongo_id']),
        phone: String(row['phone']),
        name: String(row['name']),
        isActive: bool(row['is_active']),
        createdAt: clickhouseDateToIsoRequired(String(row['created_at'])),
        updatedAt: clickhouseDateToIsoRequired(String(row['updated_at'])),
      })),
      totalCount: totalOf(rows),
    };
  }

  // ----------------------------------------------------------- promocodes ---

  async listPromocodes(query: PromocodesReadQuery): Promise<ListResult<PromocodeReadRow>> {
    const column = {
      code: 'code',
      discountPercent: 'discount_percent',
      usedCount: 'used_count',
      validUntil: 'valid_until',
      createdAt: 'created_at',
    }[query.sortBy];
    const nullable = query.sortBy === 'validUntil';
    const state = stateExpression();

    const sql = `
      SELECT mongo_id, code, discount_percent, max_usages_total, max_usages_per_user,
             valid_from, valid_until, is_active, used_count, created_at, updated_at,
             ${state} AS state,
             count() OVER () AS total_count
      FROM ${this.db}.${CLICKHOUSE_TABLES.promocodes} FINAL
      WHERE ({search:String} = '' OR positionCaseInsensitive(code, {search:String}) > 0)
        AND ({state:String} = '' OR ${state} = {state:String})
      ${orderBy(column, query.sortOrder, nullable)}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const rows = await this.run<Record<string, unknown> & WithTotal>(sql, {
      search: query.search,
      state: query.state ?? '',
      nowMs: Date.now(),
      limit: query.limit,
      offset: query.offset,
    });

    return {
      data: rows.map((row) => ({
        mongoId: String(row['mongo_id']),
        code: String(row['code']),
        discountPercent: num(row['discount_percent']),
        maxUsagesTotal: numOrNull(row['max_usages_total']),
        maxUsagesPerUser: numOrNull(row['max_usages_per_user']),
        validFrom: clickhouseDateToIso(row['valid_from'] as string | null),
        validUntil: clickhouseDateToIso(row['valid_until'] as string | null),
        isActive: bool(row['is_active']),
        usedCount: num(row['used_count']),
        state: String(row['state']) as PromocodeState,
        createdAt: clickhouseDateToIsoRequired(String(row['created_at'])),
        updatedAt: clickhouseDateToIsoRequired(String(row['updated_at'])),
      })),
      totalCount: totalOf(rows),
    };
  }

  // --------------------------------------------------------------- orders ---

  /** Pruned by `created_at` (partition key + first sort key of `orders`). */
  async listOrders(query: OrdersReadQuery): Promise<ListResult<OrderReadRow>> {
    const column = {
      createdAt: 'created_at',
      amount: 'amount',
      finalAmount: 'final_amount',
    }[query.sortBy];

    const sql = `
      SELECT mongo_id, mongo_user_id, amount, mongo_promocode_id, promocode_code,
             discount_amount, final_amount, created_at, updated_at,
             count() OVER () AS total_count
      FROM ${this.db}.${CLICKHOUSE_TABLES.orders} FINAL
      WHERE mongo_user_id = {userId:String}
        AND ({hasPromocode:Int8} = -1
             OR (mongo_promocode_id IS NOT NULL) = ({hasPromocode:Int8} = 1))
      ${orderBy(column, query.sortOrder)}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const rows = await this.run<Record<string, unknown> & WithTotal>(sql, {
      userId: query.mongoUserId,
      hasPromocode: query.hasPromocode === null ? -1 : query.hasPromocode ? 1 : 0,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      data: rows.map((row) => ({
        mongoId: String(row['mongo_id']),
        mongoUserId: String(row['mongo_user_id']),
        amount: num(row['amount']),
        mongoPromocodeId: (row['mongo_promocode_id'] as string | null) ?? null,
        promocodeCode: (row['promocode_code'] as string | null) ?? null,
        discountAmount: numOrNull(row['discount_amount']),
        finalAmount: num(row['final_amount']),
        createdAt: clickhouseDateToIsoRequired(String(row['created_at'])),
        updatedAt: clickhouseDateToIsoRequired(String(row['updated_at'])),
      })),
      totalCount: totalOf(rows),
    };
  }

  // ------------------------------------------------------------ analytics ---

  /**
   * Metrics come from `orders`, pruned by `created_at`.
   * Every user is always returned; users without orders in the range get zeros.
   */
  async analyticsUsers(query: AnalyticsUsersReadQuery): Promise<ListResult<AnalyticsUserRow>> {
    const column = {
      ordersCount: 'orders_count',
      totalSpent: 'total_spent',
      totalDiscount: 'total_discount',
      promocodesUsed: 'promocodes_used',
      name: 'name',
      phone: 'phone',
    }[query.sortBy];

    const sql = `
      SELECT u.mongo_id                    AS mongo_id,
             u.name                        AS name,
             u.phone                       AS phone,
             u.is_active                   AS is_active,
             ifNull(o.orders_count, 0)     AS orders_count,
             ifNull(o.total_spent, 0)      AS total_spent,
             ifNull(o.total_discount, 0)   AS total_discount,
             ifNull(o.promocodes_used, 0)  AS promocodes_used,
             count() OVER ()               AS total_count
      FROM ${this.db}.${CLICKHOUSE_TABLES.users} AS u FINAL
      LEFT JOIN (
        SELECT mongo_user_id,
               count()                                          AS orders_count,
               sum(final_amount)                                AS total_spent,
               sum(ifNull(discount_amount, 0))                  AS total_discount,
               uniqExactIf(mongo_promocode_id, mongo_promocode_id IS NOT NULL) AS promocodes_used
        FROM ${this.db}.${CLICKHOUSE_TABLES.orders} FINAL
        WHERE created_at >= fromUnixTimestamp64Milli({fromMs:Int64}, 'UTC')
          AND created_at <  fromUnixTimestamp64Milli({toMs:Int64}, 'UTC')
        GROUP BY mongo_user_id
      ) AS o ON u.mongo_id = o.mongo_user_id
      WHERE ({search:String} = ''
             OR positionCaseInsensitiveUTF8(u.name, {search:String}) > 0
             OR ({digits:String} != '' AND position(u.phone_digits, {digits:String}) > 0))
      ${orderBy(column, query.sortOrder)}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const rows = await this.run<Record<string, unknown> & WithTotal>(sql, {
      search: query.search,
      digits: digitsForSearch(query.search),
      fromMs: query.fromMs,
      toMs: query.toMs,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      data: rows.map((row) => ({
        mongoId: String(row['mongo_id']),
        name: String(row['name']),
        phone: String(row['phone']),
        isActive: bool(row['is_active']),
        ordersCount: num(row['orders_count']),
        totalSpent: num(row['total_spent']),
        totalDiscount: num(row['total_discount']),
        promocodesUsed: num(row['promocodes_used']),
      })),
      totalCount: totalOf(rows),
    };
  }

  /**
   * Metrics come from `promo_usages`, pruned by `used_at`.
   * Every promo code is always returned; codes unused in the range get zeros.
   */
  async analyticsPromocodes(
    query: AnalyticsPromocodesReadQuery,
  ): Promise<ListResult<AnalyticsPromocodeRow>> {
    const column = {
      code: 'code',
      usageCount: 'usage_count',
      uniqueUsers: 'unique_users',
      grossRevenue: 'gross_revenue',
      totalDiscount: 'total_discount',
    }[query.sortBy];
    const state = stateExpression('p');

    const sql = `
      SELECT p.mongo_id                        AS mongo_id,
             p.code                            AS code,
             p.discount_percent                AS discount_percent,
             ${state}                          AS state,
             ifNull(u.usage_count, 0)          AS usage_count,
             ifNull(u.unique_users, 0)         AS unique_users,
             ifNull(u.gross_revenue, 0)        AS gross_revenue,
             ifNull(u.total_discount, 0)       AS total_discount,
             ifNull(u.gross_revenue, 0) - ifNull(u.total_discount, 0) AS net_revenue,
             count() OVER ()                   AS total_count
      FROM ${this.db}.${CLICKHOUSE_TABLES.promocodes} AS p FINAL
      LEFT JOIN (
        SELECT mongo_promocode_id,
               count()                      AS usage_count,
               uniqExact(mongo_user_id)     AS unique_users,
               sum(order_amount)            AS gross_revenue,
               sum(discount_amount)         AS total_discount
        FROM ${this.db}.${CLICKHOUSE_TABLES.promoUsages} FINAL
        WHERE used_at >= fromUnixTimestamp64Milli({fromMs:Int64}, 'UTC')
          AND used_at <  fromUnixTimestamp64Milli({toMs:Int64}, 'UTC')
        GROUP BY mongo_promocode_id
      ) AS u ON p.mongo_id = u.mongo_promocode_id
      WHERE ({search:String} = '' OR positionCaseInsensitive(p.code, {search:String}) > 0)
        AND ({state:String} = '' OR ${state} = {state:String})
      ${orderBy(column, query.sortOrder)}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const rows = await this.run<Record<string, unknown> & WithTotal>(sql, {
      search: query.search,
      state: query.state ?? '',
      nowMs: Date.now(),
      fromMs: query.fromMs,
      toMs: query.toMs,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      data: rows.map((row) => ({
        mongoId: String(row['mongo_id']),
        code: String(row['code']),
        state: String(row['state']) as PromocodeState,
        discountPercent: num(row['discount_percent']),
        usageCount: num(row['usage_count']),
        uniqueUsers: num(row['unique_users']),
        grossRevenue: num(row['gross_revenue']),
        netRevenue: num(row['net_revenue']),
        totalDiscount: num(row['total_discount']),
      })),
      totalCount: totalOf(rows),
    };
  }

  /** Usage journal, pruned by `used_at`. */
  async analyticsUsages(query: AnalyticsUsagesReadQuery): Promise<ListResult<AnalyticsUsageRow>> {
    const column = {
      usedAt: 'used_at',
      promocodeCode: 'promocode_code',
      orderAmount: 'order_amount',
      discountAmount: 'discount_amount',
    }[query.sortBy];

    const sql = `
      SELECT mongo_id,
             used_at,
             mongo_promocode_id,
             promocode_code,
             mongo_user_id,
             mongo_order_id,
             order_amount,
             discount_amount,
             user_name,
             user_phone,
             count() OVER () AS total_count
      FROM ${this.db}.${CLICKHOUSE_TABLES.promoUsages} FINAL
      WHERE used_at >= fromUnixTimestamp64Milli({fromMs:Int64}, 'UTC')
        AND used_at <  fromUnixTimestamp64Milli({toMs:Int64}, 'UTC')
        AND ({search:String} = ''
             OR positionCaseInsensitive(promocode_code, {search:String}) > 0
             OR positionCaseInsensitiveUTF8(user_name, {search:String}) > 0
             OR ({digits:String} != '' AND position(user_phone_digits, {digits:String}) > 0))
      ${orderBy(column, query.sortOrder)}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const rows = await this.run<Record<string, unknown> & WithTotal>(sql, {
      search: query.search,
      digits: digitsForSearch(query.search),
      fromMs: query.fromMs,
      toMs: query.toMs,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      data: rows.map((row) => ({
        mongoId: String(row['mongo_id']),
        usedAt: clickhouseDateToIsoRequired(String(row['used_at'])),
        mongoPromocodeId: String(row['mongo_promocode_id']),
        promocodeCode: String(row['promocode_code']),
        mongoUserId: String(row['mongo_user_id']),
        userName: String(row['user_name'] ?? ''),
        userPhone: String(row['user_phone'] ?? ''),
        mongoOrderId: String(row['mongo_order_id']),
        orderAmount: num(row['order_amount']),
        discountAmount: num(row['discount_amount']),
      })),
      totalCount: totalOf(rows),
    };
  }
}
