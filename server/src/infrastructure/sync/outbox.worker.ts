import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { APP_CONFIG, AppConfig } from '../../config/configuration';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { ClickhouseTable } from '../clickhouse/clickhouse.schema';
import { OutboxEvent, OutboxEventDocument } from '../outbox/outbox-event.schema';
import { OUTBOX_STATUS } from '../outbox/outbox.types';
import { AnalyticsCacheService } from '../redis/analytics-cache.service';
import { mapSnapshotToRow, tableForEntity } from './snapshot.mappers';

/**
 * Consumer side of the outbox: polls `outbox_events` and replicates pending
 * events into ClickHouse.
 *
 *  - the API never waits for ClickHouse, so a Mongo mutation succeeds while
 *    ClickHouse is down;
 *  - the poll loop keeps running, so the backlog is caught up automatically as
 *    soon as ClickHouse returns — no restart required;
 *  - inserts are idempotent: ReplacingMergeTree(version) keyed on `mongo_id`
 *    means a replayed event replaces the row instead of duplicating metrics.
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly model: Model<OutboxEventDocument>,
    private readonly clickhouse: ClickhouseService,
    private readonly cache: AnalyticsCacheService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.config.outbox.pollIntervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
  }

  /** Exposed so the seeder can flush its backlog immediately. */
  async drain(maxBatches = 20): Promise<number> {
    let total = 0;
    for (let index = 0; index < maxBatches; index += 1) {
      const processed = await this.tick();
      total += processed;
      if (processed === 0) break;
    }
    return total;
  }

  private async tick(): Promise<number> {
    if (this.running || this.stopped) return 0;
    this.running = true;
    try {
      return await this.processBatch();
    } catch (error) {
      this.logger.warn(`Outbox tick failed: ${(error as Error).message}`);
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async processBatch(): Promise<number> {
    const events = await this.model
      .find({ status: OUTBOX_STATUS.pending })
      .sort({ createdAt: 1, _id: 1 })
      .limit(this.config.outbox.batchSize)
      .lean()
      .exec();

    if (events.length === 0) return 0;

    const rowsByTable = new Map<ClickhouseTable, Record<string, unknown>[]>();
    for (const event of events) {
      const table = tableForEntity(event.entityType);
      const rows = rowsByTable.get(table) ?? [];
      rows.push(mapSnapshotToRow(event.entityType, event.payload, event.version));
      rowsByTable.set(table, rows);
    }

    const ids = events.map((event) => event._id as Types.ObjectId);

    try {
      for (const [table, rows] of rowsByTable) {
        await this.clickhouse.insert(table, rows);
      }
    } catch (error) {
      const message = (error as Error).message;
      await this.model
        .updateMany(
          { _id: { $in: ids } },
          [
            {
              $set: {
                attempts: { $add: ['$attempts', 1] },
                lastError: message,
                status: {
                  $cond: [
                    { $gte: [{ $add: ['$attempts', 1] }, this.config.outbox.maxAttempts] },
                    OUTBOX_STATUS.failed,
                    OUTBOX_STATUS.pending,
                  ],
                },
              },
            },
          ],
        )
        .exec();
      this.logger.warn(`ClickHouse replication postponed (${events.length} events): ${message}`);
      return 0;
    }

    await this.model
      .updateMany(
        { _id: { $in: ids } },
        { $set: { status: OUTBOX_STATUS.done, processedAt: new Date(), lastError: null } },
      )
      .exec();

    // Fresh data landed in ClickHouse: drop the short-lived analytics cache.
    await this.cache.invalidateAll();

    return events.length;
  }
}
