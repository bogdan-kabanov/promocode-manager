import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { APP_CONFIG, AppConfig } from '../../config/configuration';
import { buildSchemaStatements, buildSchemaUpgradeStatements, ClickhouseTable } from './clickhouse.schema';

/**
 * Thin ClickHouse gateway. Only the analytics read repository and the outbox
 * writer are allowed to depend on it — domain services never do.
 */
@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickhouseService.name);
  private readonly client: ClickHouseClient;
  private schemaReady = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.client = createClient({
      url: this.config.clickhouse.url,
      username: this.config.clickhouse.user,
      password: this.config.clickhouse.password,
      request_timeout: this.config.clickhouse.requestTimeoutMs,
      clickhouse_settings: { date_time_input_format: 'best_effort' },
    });
  }

  get database(): string {
    return this.config.clickhouse.database;
  }

  get isSchemaReady(): boolean {
    return this.schemaReady;
  }

  async onModuleInit(): Promise<void> {
    // Schema bootstrap runs on EVERY app start, never from an init script.
    await this.ensureSchema();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  /** Retries so the app can start before ClickHouse finished booting. */
  async ensureSchema(attempts = 30, delayMs = 1000): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        for (const statement of buildSchemaStatements(this.database)) {
          await this.client.command({ query: statement });
        }
        for (const statement of buildSchemaUpgradeStatements(this.database)) {
          await this.client.command({ query: statement });
        }
        this.schemaReady = true;
        this.logger.log('ClickHouse schema is ready');
        return;
      } catch (error) {
        if (attempt === attempts) {
          this.logger.error(
            `ClickHouse schema bootstrap failed: ${(error as Error).message}. ` +
              'The API stays up; the outbox worker will retry.',
          );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result.success;
    } catch {
      return false;
    }
  }

  async query<T>(query: string, params?: Record<string, unknown>): Promise<T[]> {
    if (!this.schemaReady) await this.ensureSchema(1, 0);
    const resultSet = await this.client.query({
      query,
      format: 'JSONEachRow',
      query_params: params,
    });
    return resultSet.json<T>();
  }

  async insert(table: ClickhouseTable, rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return;
    if (!this.schemaReady) await this.ensureSchema(1, 0);
    await this.client.insert({
      table: `${this.database}.${table}`,
      values: rows,
      format: 'JSONEachRow',
    });
  }
}
