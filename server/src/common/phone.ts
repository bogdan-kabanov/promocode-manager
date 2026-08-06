import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile';

/**
 * Phone handling rules:
 *  - metadata: `libphonenumber-js/mobile` (mobile numbers only, so +7 495 … is rejected)
 *  - default country: RU
 *  - the WHOLE input must be the number — nothing is extracted from surrounding text
 *  - the resulting country must be RU
 *  - stored format: E.164 (+79991234567)
 */

const DEFAULT_COUNTRY = 'RU';
const ALLOWED_CHARS = /^[+\d\s().-]+$/;

/** Removes every non-digit character; used for substring search on phones. */
export function phoneToDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/** Returns the E.164 representation, or `null` when the input is not a valid RU mobile number. */
export function normalizePhone(input: string): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (raw.length === 0 || !ALLOWED_CHARS.test(raw)) return null;

  const parsed = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  if (!parsed || parsed.country !== DEFAULT_COUNTRY || !parsed.isValid()) return null;

  // Guard against libphonenumber extracting a valid number out of a longer
  // string: the digits of the input must be exactly the digits of the result.
  const digits = phoneToDigits(raw);
  let candidate = digits;
  if (candidate.length === 11 && candidate.startsWith('8')) candidate = `7${candidate.slice(1)}`;
  if (candidate.length === 10) candidate = `7${candidate}`;
  if (candidate !== parsed.number.slice(1)) return null;

  return parsed.number;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}
