import { apiGet, apiPost } from '@/shared/api/http';
import type {
  ApplyPromoCodeRequest,
  CreateOrderRequest,
  FetchManyResponse,
  OrderDto,
  OrdersFetchManyRequest,
  OrdersSortBy,
  SortOrder,
} from '@/shared/api/types';

export const ORDERS_SORT_FIELDS: readonly OrdersSortBy[] = [
  'createdAt',
  'amount',
  'finalAmount',
];

export interface OrdersListParams {
  pageIndex: number;
  pageSize: number;
  sortBy: OrdersSortBy;
  sortOrder: SortOrder;
  hasPromocode: boolean | null;
}

export function buildOrdersRequest(
  params: OrdersListParams,
): OrdersFetchManyRequest {
  const body: OrdersFetchManyRequest = {
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
  if (params.hasPromocode !== null) body.hasPromocode = params.hasPromocode;
  return body;
}

export const ordersApi = {
  fetchMany: (body: OrdersFetchManyRequest) =>
    apiPost<FetchManyResponse<OrderDto>, OrdersFetchManyRequest>(
      '/orders/fetch/many',
      body,
    ),
  fetchOne: (mongoId: string) =>
    apiGet<OrderDto>(`/orders/fetch/one/${mongoId}`),
  create: (body: CreateOrderRequest) =>
    apiPost<OrderDto, CreateOrderRequest>('/orders/create', body),
  applyPromoCode: (mongoId: string, body: ApplyPromoCodeRequest) =>
    apiPost<OrderDto, ApplyPromoCodeRequest>(
      `/orders/apply-promocode/${mongoId}`,
      body,
    ),
};
