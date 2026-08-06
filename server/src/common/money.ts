/**
 * Money is stored as an integer number of kopecks in MongoDB and as Int64 in
 * ClickHouse. Floating point values never touch persistence; they only appear
 * on the API boundary, always with exactly two decimals.
 */

export type Kopecks = number;

export const KOPECKS_IN_RUBLE = 100;

/** Largest amount accepted by the API: 1 000 000 000.00 RUB. */
export const MAX_AMOUNT_KOPECKS = 100_000_000_000;

export function isValidApiMoney(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < 0) return false;
  const scaled = value * KOPECKS_IN_RUBLE;
  // Reject inputs with more than two decimals (12.345) but tolerate the tiny
  // representation error of legitimate values such as 1483.05.
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** API number (rubles) -> stored integer kopecks. */
export function toKopecks(value: number): Kopecks {
  return Math.round(value * KOPECKS_IN_RUBLE);
}

/**
 * Stored kopecks -> API number with exactly two decimals.
 * `toFixed` guarantees no artifacts such as 296.60999999999996.
 */
export function toApiNumber(kopecks: Kopecks): number {
  return Number((Math.round(kopecks) / KOPECKS_IN_RUBLE).toFixed(2));
}

/**
 * Discount is computed once, on integer kopecks, rounding half up.
 * discountAmount = round(amount * percent / 100)
 */
export function calculateDiscountKopecks(amountKopecks: Kopecks, discountPercent: number): Kopecks {
  const amount = Math.round(amountKopecks);
  const percent = Math.round(discountPercent);
  const product = amount * percent;
  const remainder = product % KOPECKS_IN_RUBLE;
  const whole = (product - remainder) / KOPECKS_IN_RUBLE;
  return remainder * 2 >= KOPECKS_IN_RUBLE ? whole + 1 : whole;
}

export function finalAmountKopecks(amountKopecks: Kopecks, discountKopecks: Kopecks): Kopecks {
  const result = amountKopecks - discountKopecks;
  return result < 0 ? 0 : result;
}
