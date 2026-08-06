import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from './outbox-event.schema';
import { OUTBOX_STATUS, OutboxEnqueueInput } from './outbox.types';

/**
 * Producer side of the outbox. Called right AFTER a successful Mongo mutation —
 * Mongo first, ClickHouse later. A failure here is logged but never propagated,
 * because the write to the source of truth already succeeded.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private lastVersion = 0;

  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly model: Model<OutboxEventDocument>,
  ) {}

  /** Strictly increasing even for events produced within the same millisecond. */
  private nextVersion(): number {
    const candidate = Date.now() * 1000;
    this.lastVersion = candidate > this.lastVersion ? candidate : this.lastVersion + 1;
    return this.lastVersion;
  }

  async enqueue(input: OutboxEnqueueInput): Promise<void> {
    await this.enqueueMany([input]);
  }

  async enqueueMany(inputs: OutboxEnqueueInput[]): Promise<void> {
    if (inputs.length === 0) return;
    try {
      await this.model.insertMany(
        inputs.map((input) => ({
          entityType: input.entityType,
          entityId: input.entityId,
          payload: input.payload as unknown as Record<string, unknown>,
          version: this.nextVersion(),
          status: OUTBOX_STATUS.pending,
          attempts: 0,
          lastError: null,
          createdAt: new Date(),
          processedAt: null,
        })),
        { ordered: false },
      );
    } catch (error) {
      this.logger.error(`Failed to enqueue outbox events: ${(error as Error).message}`);
    }
  }

  async countPending(): Promise<number> {
    return this.model.countDocuments({ status: OUTBOX_STATUS.pending }).exec();
  }
}
