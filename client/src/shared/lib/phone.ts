import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile';

/**
 * Клиент повторяет серверное правило разбора номера той же библиотекой:
 * набор метаданных `/mobile` отсеивает стационарные номера, проверка страны —
 * казахстанские мобильные, `extract: false` — номер, вырванный из текста.
 *
 * Возвращает E.164 либо null, если ввод номером не является.
 */
export function normalizeRussianMobile(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const parsed = parsePhoneNumberFromString(value, {
    defaultCountry: 'RU',
    extract: false,
  });

  if (!parsed || parsed.country !== 'RU' || !parsed.isValid()) return null;
  return parsed.number;
}

export function isRussianMobile(input: string): boolean {
  return normalizeRussianMobile(input) !== null;
}
