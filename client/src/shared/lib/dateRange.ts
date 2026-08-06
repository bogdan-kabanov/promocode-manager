/**
 * Фильтр дат аналитики. Календарные сутки считаются по часам браузера:
 * «начало суток» — местная полночь, на сервер уходит момент с нулевым смещением.
 * Диапазон полуинтервальный: `[dateFrom, dateTo)`.
 */
export const DATE_PRESETS = ['today', 'last7', 'last30', 'custom'] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export interface DateRangeValue {
  /** null — фильтр не выбран, ограничений нет. */
  preset: DatePreset | null;
  /** Календарный день `YYYY-MM-DD`, только для пресета `custom`. */
  from: string | null;
  /** Календарный день `YYYY-MM-DD` включительно, только для пресета `custom`. */
  to: string | null;
}

export interface DateRangeBounds {
  dateFrom?: string;
  dateTo?: string;
}

export const EMPTY_DATE_RANGE: DateRangeValue = {
  preset: null,
  from: null,
  to: null,
};

export function isDatePreset(value: string | null): value is DatePreset {
  return value !== null && (DATE_PRESETS as readonly string[]).includes(value);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** `YYYY-MM-DD` → местная полночь этого дня. */
export function parseCalendarDay(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  return isRealDate ? date : null;
}

export function formatCalendarDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Границы произвольного диапазона независимы: можно задать только нижнюю,
 * только верхнюю или обе. Верхний день пользователь выбирает включительно,
 * поэтому в полуинтервал уходит полночь следующих суток.
 */
export function resolveDateRange(
  value: DateRangeValue,
  now: Date = new Date(),
): DateRangeBounds {
  const today = startOfLocalDay(now);

  switch (value.preset) {
    case 'today':
      return {
        dateFrom: today.toISOString(),
        dateTo: shiftDays(today, 1).toISOString(),
      };
    case 'last7':
      return {
        dateFrom: shiftDays(today, -6).toISOString(),
        dateTo: shiftDays(today, 1).toISOString(),
      };
    case 'last30':
      return {
        dateFrom: shiftDays(today, -29).toISOString(),
        dateTo: shiftDays(today, 1).toISOString(),
      };
    case 'custom': {
      const bounds: DateRangeBounds = {};
      const from = parseCalendarDay(value.from);
      const to = parseCalendarDay(value.to);
      if (from) bounds.dateFrom = from.toISOString();
      if (to) bounds.dateTo = shiftDays(to, 1).toISOString();
      return bounds;
    }
    default:
      return {};
  }
}

/** Произвольный диапазон с началом позже окончания отправлять на сервер незачем. */
export function isDateRangeValid(value: DateRangeValue): boolean {
  if (value.preset !== 'custom') return true;
  const from = parseCalendarDay(value.from);
  const to = parseCalendarDay(value.to);
  if (!from || !to) return true;
  return from.getTime() <= to.getTime();
}
