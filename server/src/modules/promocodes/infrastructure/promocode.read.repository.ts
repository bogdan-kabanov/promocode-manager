import { Injectable } from '@nestjs/common';
import { ClickhouseService } from '../../../infrastructure/clickhouse/clickhouse.service';
import {
  AnalyticsSummary,
  ListPromoCodesParams,
  ListRedemptionsParams,
  Paginated,
  PromoCodeReadRepository,
} from '../application/ports/promocode.read-repository';
import { PromoCodeView, RedemptionView } from '../domain/promocode.types';

function esc(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const PROMO_SORT_FIELDS: Record<string, string> = {
  code: 'code',
  discountValue: 'discount_value',
  maxUsages: 'max_usages',
  usedCount: 'used_count',
  status: 'status',
  startsAt: 'starts_at',
  expiresAt: 'expires_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const REDEMPTION_SORT_FIELDS: Record<string, string> = {
  code: 'code',
  amount: 'amount',
  redeemedAt: 'redeemed_at',
};

@Injectable()
export class PromoCodeReadRepositoryImpl implements PromoCodeReadRepository {
  constructor(private readonly ch: ClickhouseService) {}

  private get db(): string {
    return this.ch.db;
  }

  async list(
    params: ListPromoCodesParams,
  ): Promise<Paginated<PromoCodeView>> {
    const { page, pageSize, search, status } = params;
    const sortField = PROMO_SORT_FIELDS[params.sortField] ?? 'created_at';
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * pageSize;

    const filters: string[] = ['deleted = 0'];
    if (search) {
      const s = esc(search.trim());
      filters.push(`(positionCaseInsensitive(code, '${s}') > 0 OR positionCaseInsensitive(description, '${s}') > 0)`);
    }
    if (status) {
      filters.push(`status = '${esc(status)}'`);
    }
    const where = `WHERE ${filters.join(' AND ')}`;

    const base = `FROM ${this.db}.promocodes FINAL ${where}`;

    const rows = await this.ch.query<Record<string, unknown>>(`
      SELECT
        id, code, description, discount_type, discount_value,
        max_usages, used_count, status,
        toString(starts_at) AS starts_at,
        toString(expires_at) AS expires_at,
        toString(created_at) AS created_at,
        toString(updated_at) AS updated_at
      ${base}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const totalRes = await this.ch.query<{ total: string }>(
      `SELECT count() AS total ${base}`,
    );
    const total = Number(totalRes[0]?.total ?? 0);

    return {
      rows: rows.map((r) => this.mapPromo(r)),
      total,
      page,
      pageSize,
    };
  }

  async listRedemptions(
    params: ListRedemptionsParams,
  ): Promise<Paginated<RedemptionView>> {
    const { page, pageSize, code } = params;
    const sortField = REDEMPTION_SORT_FIELDS[params.sortField] ?? 'redeemed_at';
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * pageSize;

    const filters: string[] = ['1 = 1'];
    if (code) {
      filters.push(`positionCaseInsensitive(code, '${esc(code.trim())}') > 0`);
    }
    const where = `WHERE ${filters.join(' AND ')}`;
    const base = `FROM ${this.db}.redemptions ${where}`;

    const rows = await this.ch.query<Record<string, unknown>>(`
      SELECT
        id, promocode_id, code, amount,
        toString(redeemed_at) AS redeemed_at
      ${base}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const totalRes = await this.ch.query<{ total: string }>(
      `SELECT count() AS total ${base}`,
    );
    const total = Number(totalRes[0]?.total ?? 0);

    return {
      rows: rows.map((r) => ({
        id: String(r.id),
        promocodeId: String(r.promocode_id),
        code: String(r.code),
        amount: Number(r.amount),
        redeemedAt: String(r.redeemed_at),
      })),
      total,
      page,
      pageSize,
    };
  }

  async analytics(): Promise<AnalyticsSummary> {
    const promoTable = `${this.db}.promocodes FINAL`;
    const redTable = `${this.db}.redemptions`;

    const totalsRes = await this.ch.query<{
      total: string;
      active: string;
    }>(`
      SELECT
        countIf(deleted = 0) AS total,
        countIf(deleted = 0 AND status = 'ACTIVE') AS active
      FROM ${promoTable}
    `);

    const redTotalsRes = await this.ch.query<{
      total: string;
      amount: string;
    }>(`
      SELECT count() AS total, sum(amount) AS amount
      FROM ${redTable}
    `);

    const byStatus = await this.ch.query<{ status: string; count: string }>(`
      SELECT status, count() AS count
      FROM ${promoTable}
      WHERE deleted = 0
      GROUP BY status
      ORDER BY count DESC
    `);

    const redemptionsByDay = await this.ch.query<{
      day: string;
      count: string;
      amount: string;
    }>(`
      SELECT
        toString(toDate(redeemed_at)) AS day,
        count() AS count,
        sum(amount) AS amount
      FROM ${redTable}
      WHERE redeemed_at >= now() - INTERVAL 30 DAY
      GROUP BY day
      ORDER BY day ASC
    `);

    const topPromocodes = await this.ch.query<{
      code: string;
      redemptions: string;
      amount: string;
    }>(`
      SELECT code, count() AS redemptions, sum(amount) AS amount
      FROM ${redTable}
      GROUP BY code
      ORDER BY redemptions DESC
      LIMIT 5
    `);

    return {
      totalPromocodes: Number(totalsRes[0]?.total ?? 0),
      activePromocodes: Number(totalsRes[0]?.active ?? 0),
      totalRedemptions: Number(redTotalsRes[0]?.total ?? 0),
      totalDiscountGiven: Number(redTotalsRes[0]?.amount ?? 0),
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      redemptionsByDay: redemptionsByDay.map((r) => ({
        day: r.day,
        count: Number(r.count),
        amount: Number(r.amount),
      })),
      topPromocodes: topPromocodes.map((r) => ({
        code: r.code,
        redemptions: Number(r.redemptions),
        amount: Number(r.amount),
      })),
    };
  }

  private mapPromo(r: Record<string, unknown>): PromoCodeView {
    const expires = String(r.expires_at);
    return {
      id: String(r.id),
      code: String(r.code),
      description: String(r.description ?? ''),
      discountType: r.discount_type as PromoCodeView['discountType'],
      discountValue: Number(r.discount_value),
      maxUsages: Number(r.max_usages),
      usedCount: Number(r.used_count),
      status: r.status as PromoCodeView['status'],
      startsAt: String(r.starts_at),
      expiresAt: expires && expires !== '1970-01-01 00:00:00.000' ? expires : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }
}
