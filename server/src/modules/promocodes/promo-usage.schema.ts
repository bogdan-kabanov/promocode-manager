import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Immutable fact: a promo code was applied to an order. Never updated. */
@Schema({ collection: 'promo_usages', versionKey: false })
export class PromoUsage {
  @Prop({ required: true, type: String, index: true })
  mongoPromocodeId!: string;

  @Prop({ required: true, type: String })
  promocodeCode!: string;

  @Prop({ required: true, type: String, index: true })
  mongoUserId!: string;

  @Prop({ required: true, type: String, index: true })
  mongoOrderId!: string;

  /** Integer kopecks. */
  @Prop({ required: true, type: Number })
  orderAmount!: number;

  /** Integer kopecks. */
  @Prop({ required: true, type: Number })
  discountAmount!: number;

  @Prop({ required: true, type: Date, default: () => new Date(), index: true })
  usedAt!: Date;
}

export type PromoUsageDocument = HydratedDocument<PromoUsage>;

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);
PromoUsageSchema.index({ mongoPromocodeId: 1, mongoUserId: 1 });
