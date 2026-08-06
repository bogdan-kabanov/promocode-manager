import type { UserDto } from './types';

const ACCESS_KEY = 'pcm.accessToken';
const REFRESH_KEY = 'pcm.refreshToken';
const USER_KEY = 'pcm.user';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: UserDto | null;
}

function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* приватный режим браузера — сессия живёт до перезагрузки */
  }
}

function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* см. writeItem */
  }
}

function isUserDto(value: unknown): value is UserDto {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<UserDto>;
  return (
    typeof candidate.mongoId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.phone === 'string'
  );
}

export const tokenStorage = {
  getAccessToken: (): string | null => readItem(ACCESS_KEY),
  getRefreshToken: (): string | null => readItem(REFRESH_KEY),

  getUser(): UserDto | null {
    const raw = readItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isUserDto(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  setTokens(accessToken: string, refreshToken: string): void {
    writeItem(ACCESS_KEY, accessToken);
    writeItem(REFRESH_KEY, refreshToken);
  },

  setUser(user: UserDto): void {
    writeItem(USER_KEY, JSON.stringify(user));
  },

  clear(): void {
    removeItem(ACCESS_KEY);
    removeItem(REFRESH_KEY);
    removeItem(USER_KEY);
  },
};
