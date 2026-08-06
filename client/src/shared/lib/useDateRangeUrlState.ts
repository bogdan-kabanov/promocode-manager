import { useCallback, useMemo } from 'react';
import {
  DATE_PRESETS,
  DateRangeBounds,
  DateRangeValue,
  DatePreset,
  isDateRangeValid,
  resolveDateRange,
} from './dateRange';
import { readEnum, useUrlQueryState } from './useUrlQueryState';
import { URL_KEYS } from './useTableUrlState';

export const DATE_URL_KEYS = {
  preset: 'period',
  from: 'from',
  to: 'to',
} as const;

export interface DateRangeUrlState {
  value: DateRangeValue;
  bounds: DateRangeBounds;
  isValid: boolean;
  setPreset: (preset: DatePreset | null) => void;
  setCustomDay: (edge: 'from' | 'to', day: string) => void;
}

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

function readDay(searchParams: URLSearchParams, key: string): string | null {
  const raw = searchParams.get(key);
  return raw !== null && CALENDAR_DAY.test(raw) ? raw : null;
}

/**
 * Единый для трёх аналитических таблиц фильтр дат.
 * При первом открытии пресет не выбран и границ нет — видны все записи.
 */
export function useDateRangeUrlState(): DateRangeUrlState {
  const { searchParams, patchUrl } = useUrlQueryState();

  const preset = readEnum<DatePreset>(
    searchParams,
    DATE_URL_KEYS.preset,
    DATE_PRESETS,
    null,
  );

  const value = useMemo<DateRangeValue>(
    () => ({
      preset,
      from: preset === 'custom' ? readDay(searchParams, DATE_URL_KEYS.from) : null,
      to: preset === 'custom' ? readDay(searchParams, DATE_URL_KEYS.to) : null,
    }),
    [preset, searchParams],
  );

  const setPreset = useCallback(
    (next: DatePreset | null) => {
      patchUrl({
        [DATE_URL_KEYS.preset]: next,
        [DATE_URL_KEYS.from]: null,
        [DATE_URL_KEYS.to]: null,
        [URL_KEYS.page]: null,
      });
    },
    [patchUrl],
  );

  const setCustomDay = useCallback(
    (edge: 'from' | 'to', day: string) => {
      patchUrl({
        [DATE_URL_KEYS.preset]: 'custom',
        [DATE_URL_KEYS[edge]]: day || null,
        [URL_KEYS.page]: null,
      });
    },
    [patchUrl],
  );

  const isValid = isDateRangeValid(value);
  const bounds = useMemo(
    () => (isValid ? resolveDateRange(value) : {}),
    [isValid, value],
  );

  return { value, bounds, isValid, setPreset, setCustomDay };
}
