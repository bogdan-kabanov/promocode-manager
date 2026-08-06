import { t } from '@/shared/i18n';

const NBSP = '\u00A0';

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * ISO 8601 с нулевым смещением → `DD.MM.YYYY HH:mm` в поясе браузера.
 * Пустое значение остаётся пустым.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return t('value.empty');
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t('value.empty');
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${day}.${month}.${date.getFullYear()} ${hours}:${minutes}`;
}

/** Деньги всегда с двумя знаками и знаком рубля. */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return t('value.empty');
  }
  return `${value.toFixed(2)}${NBSP}₽`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return t('value.empty');
  }
  return String(value);
}

export function formatPercent(value: number): string {
  return `${value}${NBSP}%`;
}

/** E.164 `+79991234567` → `+7 999 123 45 67`. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return t('value.empty');
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11 || (digits[0] !== '7' && digits[0] !== '8')) {
    return phone;
  }
  return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

/**
 * Срок действия промокода: пустая нижняя граница означает действие
 * с момента создания, пустая верхняя — бессрочность.
 */
export function formatValidity(
  validFrom: string | null | undefined,
  validUntil: string | null | undefined,
): string {
  if (!validFrom && !validUntil) return t('value.unlimited');
  const from = validFrom ? formatDateTime(validFrom) : t('value.fromCreation');
  const until = validUntil ? formatDateTime(validUntil) : t('value.unlimited');
  return `${from} — ${until}`;
}

/** ISO-момент → значение для `<input type="datetime-local">` в местном поясе. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Значение `<input type="datetime-local">` читается как местное время. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
