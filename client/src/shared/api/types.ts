/**
 * DTO контракта `/api`. Тела запросов и ответов — camelCase,
 * моменты времени — ISO 8601 с нулевым смещением, деньги — число до копейки,
 * телефон — E.164. Идентификаторы: собственный `mongoId`, ссылки — `mongo…Id`.
 */

export type SortOrder = 'asc' | 'desc';

export interface FetchManyRequest {
  pageIndex: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface FetchManyResponse<TRow> {
  data: TRow[];
  totalCount: number;
}

export interface DateRangeRequest {
  dateFrom?: string;
  dateTo?: string;
}

/* ------------------------------- Пользователь ------------------------------ */

export interface UserDto {
  mongoId: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UsersSortBy = 'name' | 'phone' | 'createdAt';

export interface UsersFetchManyRequest extends FetchManyRequest {
  sortBy?: UsersSortBy;
  search?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name: string;
  phone: string;
}

/* --------------------------------- Промокод -------------------------------- */

export const PROMOCODE_STATES = [
  'ACTIVE',
  'SCHEDULED',
  'EXPIRED',
  'EXHAUSTED',
  'DISABLED',
] as const;

export type PromoCodeState = (typeof PROMOCODE_STATES)[number];

/** Документ промокода из MongoDB: заполняет форму редактирования. */
export interface PromoCodeDto {
  mongoId: string;
  code: string;
  discountPercent: number;
  maxUsagesTotal: number | null;
  maxUsagesPerUser: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Строка списка промокодов: то же плюс вычисленное состояние. */
export interface PromoCodeRow extends PromoCodeDto {
  state: PromoCodeState;
}

export type PromoCodesSortBy =
  | 'code'
  | 'discountPercent'
  | 'usedCount'
  | 'validUntil'
  | 'createdAt';

export interface PromoCodesFetchManyRequest extends FetchManyRequest {
  sortBy?: PromoCodesSortBy;
  search?: string;
  state?: PromoCodeState;
}

export interface CreatePromoCodeRequest {
  code: string;
  discountPercent: number;
  maxUsagesTotal: number | null;
  maxUsagesPerUser: number | null;
  validFrom: string | null;
  validUntil: string | null;
}

export type UpdatePromoCodeRequest = Omit<CreatePromoCodeRequest, 'code'>;

/* ---------------------------------- Заказ ---------------------------------- */

export interface OrderDto {
  mongoId: string;
  amount: number;
  mongoPromocodeId: string | null;
  promocodeCode: string | null;
  discountAmount: number | null;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export type OrdersSortBy = 'createdAt' | 'amount' | 'finalAmount';

export interface OrdersFetchManyRequest extends FetchManyRequest {
  sortBy?: OrdersSortBy;
  hasPromocode?: boolean;
}

export interface CreateOrderRequest {
  amount: number;
}

export interface ApplyPromoCodeRequest {
  code: string;
}

/* -------------------------------- Аналитика -------------------------------- */

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

export type AnalyticsUsersSortBy =
  | 'name'
  | 'phone'
  | 'ordersCount'
  | 'totalSpent'
  | 'totalDiscount'
  | 'promocodesUsed';

export interface AnalyticsUsersFetchManyRequest
  extends FetchManyRequest,
    DateRangeRequest {
  sortBy?: AnalyticsUsersSortBy;
  search?: string;
}

export interface AnalyticsPromoCodeRow {
  mongoId: string;
  code: string;
  discountPercent: number;
  state: PromoCodeState;
  usageCount: number;
  uniqueUsers: number;
  grossRevenue: number;
  netRevenue: number;
  totalDiscount: number;
  validFrom: string | null;
  validUntil: string | null;
}

export type AnalyticsPromoCodesSortBy =
  | 'code'
  | 'usageCount'
  | 'uniqueUsers'
  | 'grossRevenue'
  | 'totalDiscount';

export interface AnalyticsPromoCodesFetchManyRequest
  extends FetchManyRequest,
    DateRangeRequest {
  sortBy?: AnalyticsPromoCodesSortBy;
  search?: string;
  state?: PromoCodeState;
}

export interface AnalyticsUsageRow {
  mongoId: string;
  mongoPromocodeId: string;
  mongoUserId: string;
  mongoOrderId: string;
  promocodeCode: string;
  userName: string;
  userPhone: string;
  orderAmount: number;
  discountAmount: number;
  usedAt: string;
}

export type AnalyticsUsagesSortBy =
  | 'usedAt'
  | 'promocodeCode'
  | 'orderAmount'
  | 'discountAmount';

export interface AnalyticsUsagesFetchManyRequest
  extends FetchManyRequest,
    DateRangeRequest {
  sortBy?: AnalyticsUsagesSortBy;
  search?: string;
}

/* ------------------------------ Аутентификация ----------------------------- */

export interface RegisterRequest {
  phone: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponseDto extends AuthTokensDto {
  user: UserDto;
}

/** Обмен refresh-токена возвращает новую пару; пользователь может не прийти. */
export interface RefreshResponseDto extends AuthTokensDto {
  user?: UserDto;
}

/* --------------------------------- Ошибки ---------------------------------- */

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string;
  details?: {
    code?: string;
    field_errors?: ApiFieldError[];
  };
}
