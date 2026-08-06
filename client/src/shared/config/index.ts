export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/** Верхняя граница задана заданием: страница не больше 100 записей. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Таймаут запроса и одна повторная попытка держат показ ошибки
 * в пределах 10 секунд, требуемых заданием.
 */
export const REQUEST_TIMEOUT_MS = 4500;
export const QUERY_RETRY_COUNT = 1;
export const QUERY_RETRY_DELAY_MS = 300;

/**
 * Мост через задержку репликации Mongo → ClickHouse: после мутации список
 * перечитывается по этому расписанию, пока в нём не появится изменённая запись.
 * Задание допускает отставание до 2 секунд.
 */
export const SYNC_POLL_DELAYS_MS = [350, 500, 650, 900, 1200] as const;

export const AMOUNT_MAX = 10_000_000;
export const PROMOCODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
