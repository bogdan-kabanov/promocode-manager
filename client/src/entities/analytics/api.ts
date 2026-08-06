import { apiPost } from '@/shared/api/http';
import type {
  AnalyticsPromoCodeRow,
  AnalyticsPromoCodesFetchManyRequest,
  AnalyticsPromoCodesSortBy,
  AnalyticsUsageRow,
  AnalyticsUsagesFetchManyRequest,
  AnalyticsUsagesSortBy,
  AnalyticsUserRow,
  AnalyticsUsersFetchManyRequest,
  AnalyticsUsersSortBy,
  FetchManyResponse,
  PromoCodeState,
  SortOrder,
} from '@/shared/api/types';
import type { DateRangeBounds } from '@/shared/lib/dateRange';

export const ANALYTICS_USERS_SORT_FIELDS: readonly AnalyticsUsersSortBy[] = [
  'name',
  'phone',
  'ordersCount',
  'totalSpent',
  'totalDiscount',
  'promocodesUsed',
];

export const ANALYTICS_PROMOCODES_SORT_FIELDS: readonly AnalyticsPromoCodesSortBy[] =
  ['code', 'usageCount', 'uniqueUsers', 'grossRevenue', 'totalDiscount'];

export const ANALYTICS_USAGES_SORT_FIELDS: readonly AnalyticsUsagesSortBy[] = [
  'usedAt',
  'promocodeCode',
  'orderAmount',
  'discountAmount',
];

interface BaseParams<TSortBy extends string> {
  pageIndex: number;
  pageSize: number;
  sortBy: TSortBy;
  sortOrder: SortOrder;
  search: string;
  bounds: DateRangeBounds;
}

export type AnalyticsUsersParams = BaseParams<AnalyticsUsersSortBy>;
export type AnalyticsUsagesParams = BaseParams<AnalyticsUsagesSortBy>;
export interface AnalyticsPromoCodesParams
  extends BaseParams<AnalyticsPromoCodesSortBy> {
  state: PromoCodeState | null;
}

function base<TSortBy extends string>(params: BaseParams<TSortBy>) {
  const body = {
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  } as {
    pageIndex: number;
    pageSize: number;
    sortBy: TSortBy;
    sortOrder: SortOrder;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  if (params.search) body.search = params.search;
  if (params.bounds.dateFrom) body.dateFrom = params.bounds.dateFrom;
  if (params.bounds.dateTo) body.dateTo = params.bounds.dateTo;
  return body;
}

export function buildAnalyticsUsersRequest(
  params: AnalyticsUsersParams,
): AnalyticsUsersFetchManyRequest {
  return base(params);
}

export function buildAnalyticsPromoCodesRequest(
  params: AnalyticsPromoCodesParams,
): AnalyticsPromoCodesFetchManyRequest {
  const body: AnalyticsPromoCodesFetchManyRequest = base(params);
  if (params.state !== null) body.state = params.state;
  return body;
}

export function buildAnalyticsUsagesRequest(
  params: AnalyticsUsagesParams,
): AnalyticsUsagesFetchManyRequest {
  return base(params);
}

export const analyticsApi = {
  users: (body: AnalyticsUsersFetchManyRequest) =>
    apiPost<FetchManyResponse<AnalyticsUserRow>, AnalyticsUsersFetchManyRequest>(
      '/analytics/users/fetch/many',
      body,
    ),
  promoCodes: (body: AnalyticsPromoCodesFetchManyRequest) =>
    apiPost<
      FetchManyResponse<AnalyticsPromoCodeRow>,
      AnalyticsPromoCodesFetchManyRequest
    >('/analytics/promocodes/fetch/many', body),
  usages: (body: AnalyticsUsagesFetchManyRequest) =>
    apiPost<
      FetchManyResponse<AnalyticsUsageRow>,
      AnalyticsUsagesFetchManyRequest
    >('/analytics/usages/fetch/many', body),
};
