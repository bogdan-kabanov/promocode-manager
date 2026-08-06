import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const PROMOCODE_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

@Schema({ collection: 'promocodes', timestamps: true, versionKey: false })
export class PromoCode {
  /** Always uppercase, unique, matches PROMOCODE_CODE_PATTERN. */
  @Prop({ required: true, type: String, unique: true, index: true })
  code!: string;

  @Prop({ required: true, type: Number, min: 1, max: 100 })
  discountPercent!: number;

  @Prop({ type: Number, default: null, min: 1 })
  maxUsagesTotal!: number | null;

  @Prop({ type: Number, default: null, min: 1 })
  maxUsagesPerUser!: number | null;

  @Prop({ type: Date, default: null })
  validFrom!: Date | null;

  @Prop({ type: Date, default: null })
  validUntil!: Date | null;

  @Prop({ required: true, type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ required: true, type: Number, default: 0 })
  usedCount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PromoCodeDocument = HydratedDocument<PromoCode>;

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);
