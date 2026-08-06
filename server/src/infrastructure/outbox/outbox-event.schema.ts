import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OUTBOX_STATUS, OutboxEntityType, OutboxStatus } from './outbox.types';

/**
 * `outbox_events` — the transactional outbox that replicates MongoDB (source of
 * truth) into ClickHouse (read model).
 *
 * Fields:
 *   entityType  user | promocode | order | promo_usage
 *   entityId    Mongo `_id` of the changed document (the ClickHouse dedup key)
 *   payload     full domain snapshot of the document after the mutation
 *   version     monotonic counter, becomes ReplacingMergeTree's version column
 *   status      pending -> done, or failed after `OUTBOX_MAX_ATTEMPTS` tries
 *   attempts    number of delivery attempts
 *   lastError   message of the last failure (diagnostics only)
 *   createdAt   when the event was produced
 *   processedAt when the event reached ClickHouse
 */
@Schema({ collection: 'outbox_events', versionKey: false })
export class OutboxEvent {
  @Prop({ required: true, type: String })
  entityType!: OutboxEntityType;

  @Prop({ required: true, type: String })
  entityId!: string;

  @Prop({ required: true, type: Object })
  payload!: Record<string, unknown>;

  @Prop({ required: true, type: Number })
  version!: number;

  @Prop({ required: true, type: String, default: OUTBOX_STATUS.pending })
  status!: OutboxStatus;

  @Prop({ required: true, type: Number, default: 0 })
  attempts!: number;

  @Prop({ type: String, default: null })
  lastError!: string | null;

  @Prop({ required: true, type: Date, default: () => new Date() })
  createdAt!: Date;

  @Prop({ type: Date, default: null })
  processedAt!: Date | null;
}

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ status: 1, createdAt: 1 });
