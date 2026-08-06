import { apiGet, apiPost, apiPut } from '@/shared/api/http';
import type {
  CreatePromoCodeRequest,
  FetchManyResponse,
  PromoCodeDto,
  PromoCodeRow,
  PromoCodeState,
  PromoCodesFetchManyRequest,
  PromoCodesSortBy,
  SortOrder,
  UpdatePromoCodeRequest,
} from '@/shared/api/types';

export const PROMOCODES_SORT_FIELDS: readonly PromoCodesSortBy[] = [
  'code',
  'discountPercent',
  'usedCount',
  'validUntil',
  'createdAt',
];

export interface PromoCodesListParams {
  pageIndex: number;
  pageSize: number;
  sortBy: PromoCodesSortBy;
  sortOrder: SortOrder;
  search: string;
  state: PromoCodeState | null;
}

export function buildPromoCodesRequest(
  params: PromoCodesListParams,
): PromoCodesFetchManyRequest {
  const body: PromoCodesFetchManyRequest = {
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
  if (params.search) body.search = params.search;
  if (params.state !== null) body.state = params.state;
  return body;
}

export const promoCodesApi = {
  fetchMany: (body: PromoCodesFetchManyRequest) =>
    apiPost<FetchManyResponse<PromoCodeRow>, PromoCodesFetchManyRequest>(
      '/promocodes/fetch/many',
      body,
    ),
  fetchOne: (mongoId: string) =>
    apiGet<PromoCodeDto>(`/promocodes/fetch/one/${mongoId}`),
  create: (body: CreatePromoCodeRequest) =>
    apiPost<PromoCodeDto, CreatePromoCodeRequest>('/promocodes/create', body),
  update: (mongoId: string, body: UpdatePromoCodeRequest) =>
    apiPut<PromoCodeDto, UpdatePromoCodeRequest>(
      `/promocodes/update/${mongoId}`,
      body,
    ),
  deactivate: (mongoId: string) =>
    apiPost<PromoCodeDto>(`/promocodes/deactivate/${mongoId}`),
  activate: (mongoId: string) =>
    apiPost<PromoCodeDto>(`/promocodes/activate/${mongoId}`),
};
