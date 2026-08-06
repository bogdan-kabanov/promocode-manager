import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UrlPatch = Record<string, string | null>;

/**
 * Состояние таблиц и фильтров живёт в адресе страницы, чтобы переживать
 * перезагрузку и переход по прямой ссылке.
 */
export function useUrlQueryState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const patchUrl = useCallback(
    (patch: UrlPatch) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { searchParams, patchUrl };
}

export function readInt(
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = searchParams.get(key);
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export function readEnum<TValue extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly TValue[],
  fallback: TValue | null,
): TValue | null {
  const raw = searchParams.get(key);
  if (raw === null) return fallback;
  return (allowed as readonly string[]).includes(raw)
    ? (raw as TValue)
    : fallback;
}
