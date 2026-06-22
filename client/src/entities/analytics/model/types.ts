export interface AnalyticsSummary {
  totalPromocodes: number;
  activePromocodes: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  byStatus: { status: string; count: number }[];
  redemptionsByDay: { day: string; count: number; amount: number }[];
  topPromocodes: { code: string; redemptions: number; amount: number }[];
}

export interface Redemption {
  id: string;
  promocodeId: string;
  code: string;
  amount: number;
  redeemedAt: string;
}
