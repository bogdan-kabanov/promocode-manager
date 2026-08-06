import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromoCode, PromoCodeDocument } from './promocode.schema';

export interface CreatePromocodeInput {
  code: string;
  discountPercent: number;
  maxUsagesTotal: number | null;
  maxUsagesPerUser: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive?: boolean;
  usedCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdatePromocodeInput {
  discountPercent?: number;
  maxUsagesTotal?: number | null;
  maxUsagesPerUser?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
}

@Injectable()
export class PromocodesRepository {
  constructor(
    @InjectModel(PromoCode.name)
    private readonly model: Model<PromoCodeDocument>,
  ) {}

  async findById(id: string): Promise<PromoCodeDocument | null> {
    return this.model.findById(id).exec();
  }

  async findByCode(code: string): Promise<PromoCodeDocument | null> {
    return this.model.findOne({ code }).exec();
  }

  async create(input: CreatePromocodeInput): Promise<PromoCodeDocument> {
    return this.model.create({ ...input, usedCount: input.usedCount ?? 0 });
  }

  /**
   * Seed-only. Mongoose keeps an explicitly provided `createdAt` / `updatedAt`,
   * so the demo data can live in the past.
   */
  async createManyWithTimestamps(
    inputs: Required<CreatePromocodeInput>[],
  ): Promise<PromoCodeDocument[]> {
    return this.model.insertMany(inputs);
  }

  async update(id: string, input: UpdatePromocodeInput): Promise<PromoCodeDocument | null> {
    return this.model.findByIdAndUpdate(id, { $set: input }, { new: true }).exec();
  }

  async setActive(id: string, isActive: boolean): Promise<PromoCodeDocument | null> {
    return this.model.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).exec();
  }

  /**
   * Atomically reserves one usage slot: the `$inc` only happens while
   * `usedCount < maxUsagesTotal`. Returns `null` when the total limit is full,
   * which makes the number of successes under concurrency exactly
   * `maxUsagesTotal`.
   */
  async reserveUsage(id: string): Promise<PromoCodeDocument | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          $or: [
            { maxUsagesTotal: null },
            { $expr: { $lt: ['$usedCount', '$maxUsagesTotal'] } },
          ],
        },
        { $inc: { usedCount: 1 } },
        { new: true },
      )
      .exec();
  }

  /** Compensating update used when a usage could not be persisted. */
  async releaseUsage(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $inc: { usedCount: -1 } }).exec();
  }

  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async findAll(): Promise<PromoCodeDocument[]> {
    return this.model.find().exec();
  }
}
