import { toIso, toIsoRequired } from '../../common/datetime';
import { PromocodeSnapshot } from '../../infrastructure/outbox/outbox.types';
import { computePromocodeState, PromocodeState } from './promocode-state';
import { PromoCodeDocument } from './promocode.schema';

export interface PromocodeResponse {
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

export function toPromocodeResponse(
  document: PromoCodeDocument,
  now: Date = new Date(),
): PromocodeResponse {
  return {
    mongoId: document.id as string,
    code: document.code,
    discountPercent: document.discountPercent,
    maxUsagesTotal: document.maxUsagesTotal,
    maxUsagesPerUser: document.maxUsagesPerUser,
    validFrom: toIso(document.validFrom),
    validUntil: toIso(document.validUntil),
    isActive: document.isActive,
    usedCount: document.usedCount,
    state: computePromocodeState(
      {
        isActive: document.isActive,
        usedCount: document.usedCount,
        maxUsagesTotal: document.maxUsagesTotal,
        validFrom: document.validFrom,
        validUntil: document.validUntil,
      },
      now,
    ),
    createdAt: toIsoRequired(document.createdAt),
    updatedAt: toIsoRequired(document.updatedAt),
  };
}

export function toPromocodeSnapshot(document: PromoCodeDocument): PromocodeSnapshot {
  return {
    mongoId: document.id as string,
    code: document.code,
    discountPercent: document.discountPercent,
    maxUsagesTotal: document.maxUsagesTotal,
    maxUsagesPerUser: document.maxUsagesPerUser,
    validFrom: document.validFrom,
    validUntil: document.validUntil,
    isActive: document.isActive,
    usedCount: document.usedCount,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
