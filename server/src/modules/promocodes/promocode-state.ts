export const PROMOCODE_STATES = [
  'ACTIVE',
  'SCHEDULED',
  'EXPIRED',
  'EXHAUSTED',
  'DISABLED',
] as const;

export type PromocodeState = (typeof PROMOCODE_STATES)[number];

export interface PromocodeStateInput {
  isActive: boolean;
  usedCount: number;
  maxUsagesTotal: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
}

/**
 * State is derived, never stored. Priority (highest first):
 *   DISABLED > EXHAUSTED > EXPIRED > SCHEDULED > ACTIVE
 *
 * The validity window is half-open: [validFrom, validUntil).
 */
export function computePromocodeState(
  input: PromocodeStateInput,
  now: Date = new Date(),
): PromocodeState {
  if (!input.isActive) return 'DISABLED';
  if (input.maxUsagesTotal !== null && input.usedCount >= input.maxUsagesTotal) {
    return 'EXHAUSTED';
  }
  if (input.validUntil !== null && now.getTime() >= input.validUntil.getTime()) {
    return 'EXPIRED';
  }
  if (input.validFrom !== null && now.getTime() < input.validFrom.getTime()) {
    return 'SCHEDULED';
  }
  return 'ACTIVE';
}
