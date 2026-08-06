import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Money fields are integer kopecks. */
@Schema({ collection: 'orders', timestamps: true, versionKey: false })
export class Order {
  /** Taken from the access token; never accepted from the request body. */
  @Prop({ required: true, type: String, index: true })
  mongoUserId!: string;

  @Prop({ required: true, type: Number })
  amount!: number;

  @Prop({ type: String, default: null, index: true })
  mongoPromocodeId!: string | null;

  @Prop({ type: String, default: null })
  promocodeCode!: string | null;

  @Prop({ type: Number, default: null })
  discountAmount!: number | null;

  @Prop({ required: true, type: Number })
  finalAmount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type OrderDocument = HydratedDocument<Order>;

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ mongoUserId: 1, createdAt: -1 });
