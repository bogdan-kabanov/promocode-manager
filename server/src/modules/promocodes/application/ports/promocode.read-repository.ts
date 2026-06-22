import {
  PromoCodeStatus,
  PromoCodeView,
  RedemptionView,
} from '../../domain/promocode.types';

export interface ListPromoCodesParams {
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  status?: PromoCodeStatus;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnalyticsSummary {
  totalPromocodes: number;
  activePromocodes: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  byStatus: { status: string; count: number }[];
  redemptionsByDay: { day: string; count: number; amount: number }[];
  topPromocodes: { code: string; redemptions: number; amount: number }[];
}

export interface ListRedemptionsParams {
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  code?: string;
}

export interface PromoCodeReadRepository {
  list(params: ListPromoCodesParams): Promise<Paginated<PromoCodeView>>;
  listRedemptions(
    params: ListRedemptionsParams,
  ): Promise<Paginated<RedemptionView>>;
  analytics(): Promise<AnalyticsSummary>;
}

export const PROMOCODE_READ_REPOSITORY = Symbol('PROMOCODE_READ_REPOSITORY');
