import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickHouseClient, createClient } from '@clickhouse/client';

@Injectable()
export class ClickhouseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickhouseService.name);
  private client!: ClickHouseClient;
  private readonly database: string;

  constructor(private readonly config: ConfigService) {
    this.database = this.config.get<string>('clickhouse.database')!;
  }

  async onModuleInit(): Promise<void> {
    this.client = createClient({
      url: this.config.get<string>('clickhouse.url'),
      username: this.config.get<string>('clickhouse.user'),
      password: this.config.get<string>('clickhouse.password'),
    });
    await this.bootstrap();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  get db(): string {
    return this.database;
  }

  get raw(): ClickHouseClient {
    return this.client;
  }

  async query<T>(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<T[]> {
    const result = await this.client.query({
      query,
      format: 'JSONEachRow',
      query_params: params,
    });
    return result.json<T>();
  }

  async command(query: string): Promise<void> {
    await this.client.command({ query });
  }

  async insert(table: string, values: Record<string, unknown>[]): Promise<void> {
    if (values.length === 0) return;
    await this.client.insert({
      table: `${this.database}.${table}`,
      values,
      format: 'JSONEachRow',
    });
  }

  private async bootstrap(): Promise<void> {
    await this.command(`CREATE DATABASE IF NOT EXISTS ${this.database}`);

    await this.command(`
      CREATE TABLE IF NOT EXISTS ${this.database}.promocodes (
        id              String,
        code            String,
        description     String,
        discount_type   LowCardinality(String),
        discount_value  Float64,
        max_usages      UInt32,
        used_count      UInt32,
        status          LowCardinality(String),
        starts_at       DateTime64(3, 'UTC'),
        expires_at      Nullable(DateTime64(3, 'UTC')),
        created_at      DateTime64(3, 'UTC'),
        updated_at      DateTime64(3, 'UTC'),
        version         UInt64,
        deleted         UInt8 DEFAULT 0
      )
      ENGINE = ReplacingMergeTree(version)
      ORDER BY id
    `);

    await this.command(`
      CREATE TABLE IF NOT EXISTS ${this.database}.redemptions (
        id            String,
        promocode_id  String,
        code          String,
        amount        Float64,
        redeemed_at   DateTime64(3, 'UTC')
      )
      ENGINE = MergeTree
      ORDER BY (redeemed_at, promocode_id)
    `);

    this.logger.log('ClickHouse analytical schema is ready');
  }
}
