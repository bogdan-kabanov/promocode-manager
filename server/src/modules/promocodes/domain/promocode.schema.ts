import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DiscountType, PromoCodeStatus } from './promocode.types';

export type PromoCodeDocument = HydratedDocument<PromoCode>;

@Schema({ collection: 'promocodes', timestamps: true })
export class PromoCode {
  @Prop({ required: true, unique: true, index: true, uppercase: true, trim: true })
  code!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ required: true, enum: DiscountType })
  discountType!: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValue!: number;

  @Prop({ required: true, min: 0, default: 0 })
  maxUsages!: number;

  @Prop({ required: true, min: 0, default: 0 })
  usedCount!: number;

  @Prop({ required: true, enum: PromoCodeStatus, default: PromoCodeStatus.ACTIVE })
  status!: PromoCodeStatus;

  @Prop({ required: true })
  startsAt!: Date;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ required: true, default: 1 })
  version!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);
