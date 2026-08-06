/**
 * ClickHouse analytical read model.
 *
 * Every table is a `ReplacingMergeTree(version)` keyed by `mongo_id`, so the
 * outbox worker can safely replay an event: the newest `version` wins and the
 * metrics are never double counted. All reads use `FINAL`.
 *
 * DATE PRUNING — which column prunes which endpoint:
 *   orders       PARTITION BY toYYYYMM(created_at), ORDER BY (created_at, mongo_id)
 *                -> prunes POST /api/analytics/users/fetch/many   (dateFrom/dateTo on created_at)
 *                -> prunes POST /api/orders/fetch/many            (sorted/filtered by created_at)
 *   promo_usages PARTITION BY toYYYYMM(used_at),   ORDER BY (used_at, mongo_id)
 *                -> prunes POST /api/analytics/promocodes/fetch/many (dateFrom/dateTo on used_at)
 *                -> prunes POST /api/analytics/usages/fetch/many     (dateFrom/dateTo on used_at)
 *   users        ORDER BY mongo_id — dimension table, never filtered by date
 *   promocodes   ORDER BY mongo_id — dimension table, never filtered by date
 *
 * `created_at` / `used_at` are immutable for a given document, so a replacing
 * update always lands in the same partition and the same sorting position.
 */

export const CLICKHOUSE_TABLES = {
  users: 'users',
  promocodes: 'promocodes',
  orders: 'orders',
  promoUsages: 'promo_usages',
} as const;

export type ClickhouseTable = (typeof CLICKHOUSE_TABLES)[keyof typeof CLICKHOUSE_TABLES];

export function buildSchemaStatements(database: string): string[] {
  return [
    `CREATE DATABASE IF NOT EXISTS ${database}`,

    `CREATE TABLE IF NOT EXISTS ${database}.${CLICKHOUSE_TABLES.users} (
        mongo_id      String,
        phone         String,
        phone_digits  String,
        name          String,
        is_active     UInt8,
        created_at    DateTime64(3, 'UTC'),
        updated_at    DateTime64(3, 'UTC'),
        version       UInt64
     )
     ENGINE = ReplacingMergeTree(version)
     ORDER BY mongo_id`,

    `CREATE TABLE IF NOT EXISTS ${database}.${CLICKHOUSE_TABLES.promocodes} (
        mongo_id             String,
        code                 String,
        discount_percent     UInt8,
        max_usages_total     Nullable(UInt32),
        max_usages_per_user  Nullable(UInt32),
        valid_from           Nullable(DateTime64(3, 'UTC')),
        valid_until          Nullable(DateTime64(3, 'UTC')),
        is_active            UInt8,
        used_count           UInt32,
        created_at           DateTime64(3, 'UTC'),
        updated_at           DateTime64(3, 'UTC'),
        version              UInt64
     )
     ENGINE = ReplacingMergeTree(version)
     ORDER BY mongo_id`,

    // created_at prunes analytics/users and the orders list.
    // user_name / user_phone are denormalized so reads need no MongoDB.
    `CREATE TABLE IF NOT EXISTS ${database}.${CLICKHOUSE_TABLES.orders} (
        mongo_id            String,
        mongo_user_id       String,
        user_name           String,
        user_phone          String,
        amount              Int64,
        mongo_promocode_id  Nullable(String),
        promocode_code      Nullable(String),
        discount_amount     Nullable(Int64),
        final_amount        Int64,
        created_at          DateTime64(3, 'UTC'),
        updated_at          DateTime64(3, 'UTC'),
        version             UInt64
     )
     ENGINE = ReplacingMergeTree(version)
     PARTITION BY toYYYYMM(created_at)
     ORDER BY (created_at, mongo_id)`,

    // used_at prunes analytics/promocodes and analytics/usages.
    // user_name / user_phone captured at apply time (immutable journal).
    `CREATE TABLE IF NOT EXISTS ${database}.${CLICKHOUSE_TABLES.promoUsages} (
        mongo_id            String,
        mongo_promocode_id  String,
        promocode_code      String,
        mongo_user_id       String,
        user_name           String,
        user_phone          String,
        user_phone_digits   String,
        mongo_order_id      String,
        order_amount        Int64,
        discount_amount     Int64,
        used_at             DateTime64(3, 'UTC'),
        version             UInt64
     )
     ENGINE = ReplacingMergeTree(version)
     PARTITION BY toYYYYMM(used_at)
     ORDER BY (used_at, mongo_id)`,
  ];
}

/**
 * Additive schema upgrades for volumes that already have older table shapes.
 * Safe to re-run: ClickHouse ignores ADD COLUMN IF NOT EXISTS when present.
 */
export function buildSchemaUpgradeStatements(database: string): string[] {
  return [
    `ALTER TABLE ${database}.${CLICKHOUSE_TABLES.orders}
       ADD COLUMN IF NOT EXISTS user_name String DEFAULT '' AFTER mongo_user_id`,
    `ALTER TABLE ${database}.${CLICKHOUSE_TABLES.orders}
       ADD COLUMN IF NOT EXISTS user_phone String DEFAULT '' AFTER user_name`,
    `ALTER TABLE ${database}.${CLICKHOUSE_TABLES.promoUsages}
       ADD COLUMN IF NOT EXISTS user_name String DEFAULT '' AFTER mongo_user_id`,
    `ALTER TABLE ${database}.${CLICKHOUSE_TABLES.promoUsages}
       ADD COLUMN IF NOT EXISTS user_phone String DEFAULT '' AFTER user_name`,
    `ALTER TABLE ${database}.${CLICKHOUSE_TABLES.promoUsages}
       ADD COLUMN IF NOT EXISTS user_phone_digits String DEFAULT '' AFTER user_phone`,
  ];
}
