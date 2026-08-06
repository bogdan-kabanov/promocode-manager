import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromoUsage, PromoUsageDocument } from './promo-usage.schema';

export interface CreatePromoUsageInput {
  mongoPromocodeId: string;
  promocodeCode: string;
  mongoUserId: string;
  mongoOrderId: string;
  orderAmount: number;
  discountAmount: number;
  usedAt?: Date;
}

@Injectable()
export class PromoUsagesRepository {
  constructor(
    @InjectModel(PromoUsage.name)
    private readonly model: Model<PromoUsageDocument>,
  ) {}

  async create(input: CreatePromoUsageInput): Promise<PromoUsageDocument> {
    return this.model.create({ ...input, usedAt: input.usedAt ?? new Date() });
  }

  async createMany(inputs: Required<CreatePromoUsageInput>[]): Promise<PromoUsageDocument[]> {
    return this.model.insertMany(inputs);
  }

  async countByPromocodeAndUser(mongoPromocodeId: string, mongoUserId: string): Promise<number> {
    return this.model.countDocuments({ mongoPromocodeId, mongoUserId }).exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }

  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }
}
