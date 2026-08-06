import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnalyticsListRequestDto } from '../../../common/dto/date-range.dto';
import { PROMOCODE_STATES, PromocodeState } from '../../promocodes/promocode-state';

export const ANALYTICS_USER_SORT_FIELDS = [
  'ordersCount',
  'totalSpent',
  'totalDiscount',
  'promocodesUsed',
  'name',
  'phone',
] as const;
export type AnalyticsUserSortField = (typeof ANALYTICS_USER_SORT_FIELDS)[number];

export const ANALYTICS_PROMOCODE_SORT_FIELDS = [
  'code',
  'usageCount',
  'uniqueUsers',
  'grossRevenue',
  'totalDiscount',
] as const;
export type AnalyticsPromocodeSortField = (typeof ANALYTICS_PROMOCODE_SORT_FIELDS)[number];

export const ANALYTICS_USAGE_SORT_FIELDS = [
  'usedAt',
  'promocodeCode',
  'orderAmount',
  'discountAmount',
] as const;
export type AnalyticsUsageSortField = (typeof ANALYTICS_USAGE_SORT_FIELDS)[number];

export class FetchUserAnalyticsDto extends AnalyticsListRequestDto {
  @IsOptional()
  @IsIn(ANALYTICS_USER_SORT_FIELDS)
  sortBy: AnalyticsUserSortField = 'ordersCount';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class FetchPromocodeAnalyticsDto extends AnalyticsListRequestDto {
  @IsOptional()
  @IsIn(ANALYTICS_PROMOCODE_SORT_FIELDS)
  sortBy: AnalyticsPromocodeSortField = 'usageCount';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @IsOptional()
  @IsIn(PROMOCODE_STATES)
  state?: PromocodeState;
}

export class FetchUsageAnalyticsDto extends AnalyticsListRequestDto {
  @IsOptional()
  @IsIn(ANALYTICS_USAGE_SORT_FIELDS)
  sortBy: AnalyticsUsageSortField = 'usedAt';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
