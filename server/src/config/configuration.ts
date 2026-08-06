import type { LogLevel } from '@nestjs/common';

/**
 * The ONLY place in the codebase that is allowed to read `process.env`.
 * Every variable has a default so the app boots with zero configuration.
 */

export interface ClickhouseConfig {
  url: string;
  user: string;
  password: string;
  database: string;
  requestTimeoutMs: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  db: number;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

export interface LockConfig {
  /** How long a promo-apply lock is held before Redis expires it automatically. */
  ttlMs: number;
  /** How long a request waits for a busy lock before giving up. */
  waitMs: number;
  /** Delay between lock acquisition retries. */
  retryDelayMs: number;
}

export interface CacheConfig {
  /** TTL of the analytics list cache. */
  analyticsTtlSeconds: number;
}

export interface OutboxConfig {
  pollIntervalMs: number;
  batchSize: number;
  maxAttempts: number;
}

export interface SeedConfig {
  enabled: boolean;
  demoPhone: string;
  demoPassword: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  timezone: string;
  logLevels: LogLevel[];
  corsOrigins: string[];
  mongoUri: string;
  bcryptRounds: number;
  clickhouse: ClickhouseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  lock: LockConfig;
  cache: CacheConfig;
  outbox: OutboxConfig;
  seed: SeedConfig;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

const LOG_LEVEL_ORDER: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value;
}

/** CLICKHOUSE_PASSWORD may legitimately be an empty string. */
function readStringAllowEmpty(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined ? fallback : value;
}

function readInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(readString(name, String(fallback)), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBool(name: string, fallback: boolean): boolean {
  const value = readString(name, fallback ? 'true' : 'false').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

/** Accepts `900`, `15m`, `7d`, `12h`, `30s` and returns seconds. */
export function parseDurationToSeconds(input: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(input.trim());
  if (!match) return fallbackSeconds;
  const amount = Number.parseInt(match[1] as string, 10);
  const unit = (match[2] ?? 's').toLowerCase();
  const multiplier = unit === 'd' ? 86400 : unit === 'h' ? 3600 : unit === 'm' ? 60 : 1;
  return amount * multiplier;
}

function readLogLevels(): LogLevel[] {
  const raw = readString('LOG_LEVEL', 'warn').toLowerCase();
  const index = LOG_LEVEL_ORDER.indexOf(raw as LogLevel);
  const cut = index === -1 ? LOG_LEVEL_ORDER.indexOf('warn') : index;
  return LOG_LEVEL_ORDER.slice(0, cut + 1);
}

export function loadConfiguration(): AppConfig {
  return {
    nodeEnv: readString('NODE_ENV', 'development'),
    port: readInt('PORT', 3000),
    apiPrefix: readString('API_PREFIX', 'api'),
    timezone: readString('TZ', 'UTC'),
    logLevels: readLogLevels(),
    corsOrigins: readString('CORS_ORIGIN', 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    mongoUri: readString('MONGO_URI', 'mongodb://localhost:27017/promocodes'),
    bcryptRounds: readInt('BCRYPT_ROUNDS', 10),
    clickhouse: {
      url: readString('CLICKHOUSE_URL', 'http://localhost:8123'),
      user: readString('CLICKHOUSE_USER', 'default'),
      password: readStringAllowEmpty('CLICKHOUSE_PASSWORD', ''),
      database: readString('CLICKHOUSE_DB', 'promocodes'),
      requestTimeoutMs: readInt('CLICKHOUSE_REQUEST_TIMEOUT_MS', 10000),
    },
    redis: {
      host: readString('REDIS_HOST', 'localhost'),
      port: readInt('REDIS_PORT', 6379),
      db: readInt('REDIS_DB', 0),
    },
    jwt: {
      accessSecret: readString('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
      refreshSecret: readString('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
      accessTtlSeconds: parseDurationToSeconds(readString('JWT_ACCESS_TTL', '15m'), 900),
      refreshTtlSeconds: parseDurationToSeconds(readString('JWT_REFRESH_TTL', '7d'), 604800),
    },
    lock: {
      ttlMs: readInt('PROMO_LOCK_TTL_MS', 10000),
      waitMs: readInt('PROMO_LOCK_WAIT_MS', 5000),
      retryDelayMs: readInt('PROMO_LOCK_RETRY_DELAY_MS', 50),
    },
    cache: {
      analyticsTtlSeconds: readInt('ANALYTICS_CACHE_TTL_SECONDS', 5),
    },
    outbox: {
      pollIntervalMs: readInt('OUTBOX_POLL_INTERVAL_MS', 1000),
      batchSize: readInt('OUTBOX_BATCH_SIZE', 500),
      maxAttempts: readInt('OUTBOX_MAX_ATTEMPTS', 20),
    },
    seed: {
      enabled: readBool('SEED_ENABLED', true),
      demoPhone: readString('SEED_DEMO_PHONE', '+79991234567'),
      demoPassword: readString('SEED_DEMO_PASSWORD', 'Demo1234!'),
    },
  };
}
