export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum PromoCodeStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

export interface PromoCodeView {
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

export interface RedemptionView {
  id: string;
  promocodeId: string;
  code: string;
  amount: number;
  redeemedAt: string;
}
