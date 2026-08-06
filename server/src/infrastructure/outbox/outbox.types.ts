/**
 * Domain snapshots carried by outbox events.
 *
 * They are intentionally expressed in domain terms (camelCase, `Date`), so that
 * domain services never need to know anything about ClickHouse. The outbox
 * worker is the single place that translates a snapshot into a ClickHouse row.
 */

export const OUTBOX_ENTITY = {
  user: 'user',
  promocode: 'promocode',
  order: 'order',
  promoUsage: 'promo_usage',
} as const;

export type OutboxEntityType = (typeof OUTBOX_ENTITY)[keyof typeof OUTBOX_ENTITY];

export interface UserSnapshot {
  mongoId: string;
  phone: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromocodeSnapshot {
  mongoId: string;
  code: string;
  discountPercent: number;
  maxUsagesTotal: number | null;
  maxUsagesPerUser: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderSnapshot {
  mongoId: string;
  mongoUserId: string;
  /** Denormalized from User at write time — ClickHouse mirror is self-contained. */
  userName: string;
  userPhone: string;
  amount: number;
  mongoPromocodeId: string | null;
  promocodeCode: string | null;
  discountAmount: number | null;
  finalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoUsageSnapshot {
  mongoId: string;
  mongoPromocodeId: string;
  promocodeCode: string;
  mongoUserId: string;
  /** Denormalized from User at apply time. */
  userName: string;
  userPhone: string;
  mongoOrderId: string;
  orderAmount: number;
  discountAmount: number;
  usedAt: Date;
}

export type OutboxSnapshot =
  | UserSnapshot
  | PromocodeSnapshot
  | OrderSnapshot
  | PromoUsageSnapshot;

export interface OutboxEnqueueInput {
  entityType: OutboxEntityType;
  entityId: string;
  payload: OutboxSnapshot;
}

export const OUTBOX_STATUS = {
  pending: 'pending',
  done: 'done',
  failed: 'failed',
} as const;

export type OutboxStatus = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS];
