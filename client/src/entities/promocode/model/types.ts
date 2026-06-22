export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type PromoCodeStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsages: number;
  usedCount: number;
  status: PromoCodeStatus;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsages: number;
  status: PromoCodeStatus;
  startsAt: string;
  expiresAt?: string | null;
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: 'Процент',
  FIXED: 'Фиксированная',
};

export const STATUS_LABELS: Record<PromoCodeStatus, string> = {
  ACTIVE: 'Активен',
  PAUSED: 'Пауза',
  EXPIRED: 'Истёк',
};
