import axios from 'axios';
import { t, tErrorCode, TranslationKey } from '@/shared/i18n';
import type { ApiErrorBody, ApiFieldError } from './types';

/**
 * Ошибка API в виде, пригодном для показа: машиночитаемый код,
 * ошибки полей и HTTP-статус. Текст для человека берётся из словаря,
 * поэтому ни код, ни статус на экран не попадают.
 */
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly fieldErrors: ApiFieldError[];
  readonly isNetwork: boolean;
  readonly isTimeout: boolean;

  constructor(params: {
    status: number | null;
    code: string | null;
    fieldErrors: ApiFieldError[];
    isNetwork: boolean;
    isTimeout: boolean;
  }) {
    super(params.code ?? `HTTP ${params.status ?? 0}`);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
    this.isNetwork = params.isNetwork;
    this.isTimeout = params.isTimeout;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body = error.response?.data;
    const parsed = isApiErrorBody(body) ? body : undefined;
    return new ApiError({
      status,
      code: parsed?.details?.code ?? null,
      fieldErrors: parsed?.details?.field_errors ?? [],
      isNetwork: status === null && error.code !== 'ECONNABORTED',
      isTimeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT',
    });
  }

  return new ApiError({
    status: null,
    code: null,
    fieldErrors: [],
    isNetwork: false,
    isTimeout: false,
  });
}

const STATUS_KEYS: Record<number, TranslationKey> = {
  400: 'error.validation',
  401: 'error.unauthorized',
  403: 'error.forbidden',
  404: 'error.notFound',
  503: 'error.storageUnavailable',
};

/** Человеческая фраза для ошибки: сначала по коду, затем по статусу. */
export function apiErrorText(error: unknown): string {
  const apiError = toApiError(error);

  const byCode = tErrorCode(apiError.code);
  if (byCode) return byCode;

  if (apiError.isTimeout) return t('error.timeout');
  if (apiError.isNetwork) return t('error.network');

  if (apiError.status !== null) {
    const key = STATUS_KEYS[apiError.status];
    if (key) return t(key);
  }

  return t('error.unknown');
}
