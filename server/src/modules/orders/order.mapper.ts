import { toIsoRequired } from '../../common/datetime';
import { toApiNumber } from '../../common/money';
import { OrderSnapshot } from '../../infrastructure/outbox/outbox.types';
import { OrderReadRow } from '../analytics/read-model.types';
import { OrderDocument } from './order.schema';

/** Money fields are exposed as JS numbers with exactly two decimals. */
export interface OrderResponse {
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

export function toOrderResponse(document: OrderDocument): OrderResponse {
  return {
    mongoId: document.id as string,
    mongoUserId: document.mongoUserId,
    amount: toApiNumber(document.amount),
    mongoPromocodeId: document.mongoPromocodeId,
    promocodeCode: document.promocodeCode,
    discountAmount:
      document.discountAmount === null ? null : toApiNumber(document.discountAmount),
    finalAmount: toApiNumber(document.finalAmount),
    createdAt: toIsoRequired(document.createdAt),
    updatedAt: toIsoRequired(document.updatedAt),
  };
}

export function readRowToOrderResponse(row: OrderReadRow): OrderResponse {
  return {
    mongoId: row.mongoId,
    mongoUserId: row.mongoUserId,
    amount: toApiNumber(row.amount),
    mongoPromocodeId: row.mongoPromocodeId,
    promocodeCode: row.promocodeCode,
    discountAmount: row.discountAmount === null ? null : toApiNumber(row.discountAmount),
    finalAmount: toApiNumber(row.finalAmount),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toOrderSnapshot(
  document: OrderDocument,
  user: { name: string; phone: string },
): OrderSnapshot {
  return {
    mongoId: document.id as string,
    mongoUserId: document.mongoUserId,
    userName: user.name,
    userPhone: user.phone,
    amount: document.amount,
    mongoPromocodeId: document.mongoPromocodeId,
    promocodeCode: document.promocodeCode,
    discountAmount: document.discountAmount,
    finalAmount: document.finalAmount,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
