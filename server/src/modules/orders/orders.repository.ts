import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';

export interface CreateOrderInput {
  mongoUserId: string;
  amount: number;
  finalAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Seed rows carry every field explicitly, including the historical dates. */
export interface SeedOrderInput extends Required<CreateOrderInput> {
  mongoPromocodeId: string | null;
  promocodeCode: string | null;
  discountAmount: number | null;
}

export interface ApplyPromocodeInput {
  mongoPromocodeId: string;
  promocodeCode: string;
  discountAmount: number;
  finalAmount: number;
}

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectModel(Order.name)
    private readonly model: Model<OrderDocument>,
  ) {}

  async findById(id: string): Promise<OrderDocument | null> {
    return this.model.findById(id).exec();
  }

  async create(input: CreateOrderInput): Promise<OrderDocument> {
    return this.model.create(input);
  }

  /**
   * Seed-only. Mongoose keeps an explicitly provided `createdAt` / `updatedAt`,
   * so the demo data can live in the past.
   */
  async createManyWithTimestamps(inputs: SeedOrderInput[]): Promise<OrderDocument[]> {
    return this.model.insertMany(inputs);
  }

  /**
   * Conditional update: succeeds only while the order still has no promo code,
   * so two concurrent applies can never both win.
   */
  async applyPromocode(id: string, input: ApplyPromocodeInput): Promise<OrderDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, mongoPromocodeId: null },
        { $set: input },
        { new: true },
      )
      .exec();
  }

  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async findAll(): Promise<OrderDocument[]> {
    return this.model.find().exec();
  }
}
