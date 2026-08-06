import axios, { AxiosError } from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/shared/config';
import { toApiError } from './ApiError';
import { tokenStorage } from './tokenStorage';
import type { ApiErrorBody, RefreshResponseDto } from './types';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Публичные маршруты авторизации ходят без токена и без попытки обновления. */
    skipAuth?: boolean;
    retriedAfterRefresh?: boolean;
  }
}

export type AuthFailureReason = 'expired' | 'disabled';

const authFailureListeners = new Set<(reason: AuthFailureReason) => void>();

/** Сообщает приложению, что сессия больше не годится и нужен экран входа. */
export function onAuthFailure(
  listener: (reason: AuthFailureReason) => void,
): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

function emitAuthFailure(reason: AuthFailureReason): void {
  tokenStorage.clear();
  authFailureListeners.forEach((listener) => listener(reason));
}

/** Отдельный клиент без перехватчиков: обновление токена не должно рекурсировать. */
const authHttp = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  if (config.skipAuth) return config;
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshInFlight: Promise<string> | null = null;

async function requestNewTokens(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('refresh token is missing');

  const response = await authHttp.post<RefreshResponseDto>('/auth/refresh', {
    refreshToken,
  });
  tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
  if (response.data.user) tokenStorage.setUser(response.data.user);
  return response.data.accessToken;
}

/** Refresh-токен одноразовый, поэтому обмен идёт один на все ждущие запросы. */
function refreshOnce(): Promise<string> {
  if (!refreshInFlight) {
    const pending = requestNewTokens();
    refreshInFlight = pending;
    void pending
      .catch(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function readErrorCode(error: AxiosError): string | null {
  const body = error.response?.data;
  if (typeof body !== 'object' || body === null) return null;
  return (body as ApiErrorBody).details?.code ?? null;
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw toApiError(error);

    const config = error.config;
    const status = error.response?.status ?? null;

    if (status !== 401 || !config || config.skipAuth) {
      throw toApiError(error);
    }

    // Деактивированный пользователь теряет доступ сразу — обновлять нечего.
    if (readErrorCode(error) === 'USER_DISABLED') {
      emitAuthFailure('disabled');
      throw toApiError(error);
    }

    if (config.retriedAfterRefresh || !tokenStorage.getRefreshToken()) {
      emitAuthFailure('expired');
      throw toApiError(error);
    }

    config.retriedAfterRefresh = true;
    try {
      const accessToken = await refreshOnce();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return await http.request(config);
    } catch {
      emitAuthFailure('expired');
      throw toApiError(error);
    }
  },
);

export async function apiPost<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  options?: { skipAuth?: boolean },
): Promise<TResponse> {
  const response = await http.post<TResponse>(url, body ?? {}, {
    skipAuth: options?.skipAuth,
  });
  return response.data;
}

export async function apiGet<TResponse>(url: string): Promise<TResponse> {
  const response = await http.get<TResponse>(url);
  return response.data;
}

export async function apiPut<TResponse, TBody = unknown>(
  url: string,
  body: TBody,
): Promise<TResponse> {
  const response = await http.put<TResponse>(url, body);
  return response.data;
}
