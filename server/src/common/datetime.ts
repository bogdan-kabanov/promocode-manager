/** All timestamps travel as ISO-8601 UTC strings and are stored as UTC. */

export function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toIsoRequired(value: Date): string {
  return value.toISOString();
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

/** `2026-08-06 09:31:22.451` — the format ClickHouse accepts for DateTime64(3, 'UTC'). */
export function toClickhouseDateTime(value: Date): string {
  return (
    `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} ` +
    `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}.` +
    `${pad(value.getUTCMilliseconds(), 3)}`
  );
}

export function toClickhouseDateTimeOrNull(value: Date | null | undefined): string | null {
  return value ? toClickhouseDateTime(value) : null;
}

/** Converts a ClickHouse `DateTime64(3, 'UTC')` scalar back into an ISO string. */
export function clickhouseDateToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function clickhouseDateToIsoRequired(value: string): string {
  return clickhouseDateToIso(value) ?? new Date(0).toISOString();
}
