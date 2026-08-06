import { Injectable } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../../common/errors';
import { ListResult, toPagination } from '../../common/dto/list-request.dto';
import { resolveDateRange } from '../../common/dto/date-range.dto';
import { toApiNumber } from '../../common/money';
import { AnalyticsCacheService } from '../../infrastructure/redis/analytics-cache.service';
import { PromocodeState } from '../promocodes/promocode-state';
import { AnalyticsReadRepository } from './analytics-read.repository';
import {
  FetchPromocodeAnalyticsDto,
  FetchUsageAnalyticsDto,
  FetchUserAnalyticsDto,
} from './dto/analytics.dto';

export interface UserAnalyticsResponse {
  mongoId: string;
  name: string;
  phone: string;
  isActive: boolean;
  ordersCount: number;
  totalSpent: number;
  totalDiscount: number;
  promocodesUsed: number;
}

export interface PromocodeAnalyticsResponse {
  mongoId: string;
  code: string;
  state: PromocodeState;
  discountPercent: number;
  usageCount: number;
  uniqueUsers: number;
  grossRevenue: number;
  netRevenue: number;
  totalDiscount: number;
}

export interface UsageAnalyticsResponse {
  mongoId: string;
  usedAt: string;
  mongoPromocodeId: string;
  promocodeCode: string;
  mongoUserId: string;
  userName: string;
  userPhone: string;
  mongoOrderId: string;
  orderAmount: number;
  discountAmount: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly readModel: AnalyticsReadRepository,
    private readonly cache: AnalyticsCacheService,
  ) {}

  async fetchUsers(dto: FetchUserAnalyticsDto): Promise<ListResult<UserAnalyticsResponse>> {
    const range = resolveDateRange(dto);
    const { limit, offset } = toPagination(dto);

    return this.cached('users', dto, async () => {
      const result = await this.readModel.analyticsUsers({
        limit,
        offset,
        sortOrder: dto.sortOrder,
        sortBy: dto.sortBy,
        search: (dto.search ?? '').trim(),
        fromMs: range.from.getTime(),
        toMs: range.to.getTime(),
      });
      return {
        data: result.data.map((row) => ({
          mongoId: row.mongoId,
          name: row.name,
          phone: row.phone,
          isActive: row.isActive,
          ordersCount: row.ordersCount,
          totalSpent: toApiNumber(row.totalSpent),
          totalDiscount: toApiNumber(row.totalDiscount),
          promocodesUsed: row.promocodesUsed,
        })),
        totalCount: result.totalCount,
      };
    });
  }

  async fetchPromocodes(
    dto: FetchPromocodeAnalyticsDto,
  ): Promise<ListResult<PromocodeAnalyticsResponse>> {
    const range = resolveDateRange(dto);
    const { limit, offset } = toPagination(dto);

    return this.cached('promocodes', dto, async () => {
      const result = await this.readModel.analyticsPromocodes({
        limit,
        offset,
        sortOrder: dto.sortOrder,
        sortBy: dto.sortBy,
        search: (dto.search ?? '').trim(),
        state: dto.state ?? null,
        fromMs: range.from.getTime(),
        toMs: range.to.getTime(),
      });
      return {
        data: result.data.map((row) => ({
          mongoId: row.mongoId,
          code: row.code,
          state: row.state,
          discountPercent: row.discountPercent,
          usageCount: row.usageCount,
          uniqueUsers: row.uniqueUsers,
          grossRevenue: toApiNumber(row.grossRevenue),
          netRevenue: toApiNumber(row.netRevenue),
          totalDiscount: toApiNumber(row.totalDiscount),
        })),
        totalCount: result.totalCount,
      };
    });
  }

  async fetchUsages(dto: FetchUsageAnalyticsDto): Promise<ListResult<UsageAnalyticsResponse>> {
    const range = resolveDateRange(dto);
    const { limit, offset } = toPagination(dto);

    return this.cached('usages', dto, async () => {
      const result = await this.readModel.analyticsUsages({
        limit,
        offset,
        sortOrder: dto.sortOrder,
        sortBy: dto.sortBy,
        search: (dto.search ?? '').trim(),
        fromMs: range.from.getTime(),
        toMs: range.to.getTime(),
      });
      return {
        data: result.data.map((row) => ({
          mongoId: row.mongoId,
          usedAt: row.usedAt,
          mongoPromocodeId: row.mongoPromocodeId,
          promocodeCode: row.promocodeCode,
          mongoUserId: row.mongoUserId,
          userName: row.userName,
          userPhone: row.userPhone,
          mongoOrderId: row.mongoOrderId,
          orderAmount: toApiNumber(row.orderAmount),
          discountAmount: toApiNumber(row.discountAmount),
        })),
        totalCount: result.totalCount,
      };
    });
  }

  /**
   * Cache-aside with a hard availability rule: ClickHouse is probed FIRST, so a
   * ClickHouse outage answers 503 even when a fresh cache entry exists.
   */
  private async cached<T>(endpoint: string, payload: unknown, load: () => Promise<T>): Promise<T> {
    if (!(await this.readModel.isAvailable())) {
      throw BusinessException.unavailable(ErrorCode.ANALYTICS_UNAVAILABLE);
    }

    const key = this.cache.buildKey(endpoint, payload);
    const hit = await this.cache.read<T>(key);
    if (hit !== null) return hit;

    const fresh = await load();
    await this.cache.write(key, fresh);
    return fresh;
  }
}
