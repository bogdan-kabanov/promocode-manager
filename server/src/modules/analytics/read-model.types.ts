import { SortOrder } from '../../common/dto/list-request.dto';
import { PromocodeState } from '../promocodes/promocode-state';

export interface BaseReadQuery {
  limit: number;
  offset: number;
  sortOrder: SortOrder;
  search: string;
}

export interface UsersReadQuery extends BaseReadQuery {
  sortBy: 'name' | 'phone' | 'createdAt';
  isActive: boolean | null;
}

export interface PromocodesReadQuery extends BaseReadQuery {
  sortBy: 'code' | 'discountPercent' | 'usedCount' | 'validUntil' | 'createdAt';
  state: PromocodeState | null;
}

/** Orders have no free-text search in the contract, hence no `search` field. */
export interface OrdersReadQuery extends Omit<BaseReadQuery, 'search'> {
  sortBy: 'createdAt' | 'amount' | 'finalAmount';
  mongoUserId: string;
  hasPromocode: boolean | null;
}

export interface DateRangeQuery {
  fromMs: number;
  toMs: number;
}

export interface AnalyticsUsersReadQuery extends BaseReadQuery, DateRangeQuery {
  sortBy:
    | 'ordersCount'
    | 'totalSpent'
    | 'totalDiscount'
    | 'promocodesUsed'
    | 'name'
    | 'phone';
}

export interface AnalyticsPromocodesReadQuery extends BaseReadQuery, DateRangeQuery {
  sortBy: 'code' | 'usageCount' | 'uniqueUsers' | 'grossRevenue' | 'totalDiscount';
  state: PromocodeState | null;
}

export interface AnalyticsUsagesReadQuery extends BaseReadQuery, DateRangeQuery {
  sortBy: 'usedAt' | 'promocodeCode' | 'orderAmount' | 'discountAmount';
}

export interface UserReadRow {
  mongoId: string;
  phone: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromocodeReadRow {
  mongoId: string;
  code: string;
  discountPercent: number;
  maxUsagesTotal: number | null;
  maxUsagesPerUser: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  usedCount: number;
  state: PromocodeState;
  createdAt: string;
  updatedAt: string;
}

export interface OrderReadRow {
  mongoId: string;
  mongoUserId: string;
  amount: number;
  mongoPromocodeId: string | null;
  promocodeCode: string | null;
  discountAmount: number | null;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsUserRow {
  mongoId: string;
  name: string;
  phone: string;
  isActive: boolean;
  ordersCount: number;
  totalSpent: number;
  totalDiscount: number;
  promocodesUsed: number;
}

export interface AnalyticsPromocodeRow {
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

export interface AnalyticsUsageRow {
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
