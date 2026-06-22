import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromoCode, PromoCodeDocument } from '../domain/promocode.schema';
import {
  CreatePromoCodeData,
  PromoCodeEntity,
  PromoCodeWriteRepository,
  UpdatePromoCodeData,
} from '../application/ports/promocode.write-repository';

@Injectable()
export class PromoCodeMongoRepository implements PromoCodeWriteRepository {
  constructor(
    @InjectModel(PromoCode.name)
    private readonly model: Model<PromoCodeDocument>,
  ) {}

  private toEntity(doc: PromoCodeDocument): PromoCodeEntity {
    const obj = doc.toObject();
    return { ...obj, id: doc._id.toString() } as PromoCodeEntity;
  }

  async create(data: CreatePromoCodeData): Promise<PromoCodeEntity> {
    const created = await this.model.create({ ...data, version: 1 });
    return this.toEntity(created);
  }

  async update(
    id: string,
    data: UpdatePromoCodeData,
  ): Promise<PromoCodeEntity | null> {
    const updated = await this.model.findByIdAndUpdate(
      id,
      { $set: data, $inc: { version: 1 } },
      { new: true },
    );
    return updated ? this.toEntity(updated) : null;
  }

  async delete(id: string): Promise<PromoCodeEntity | null> {
    const deleted = await this.model.findByIdAndDelete(id);
    return deleted ? this.toEntity(deleted) : null;
  }

  async incrementUsage(id: string): Promise<PromoCodeEntity | null> {
    const updated = await this.model.findByIdAndUpdate(
      id,
      { $inc: { usedCount: 1, version: 1 } },
      { new: true },
    );
    return updated ? this.toEntity(updated) : null;
  }

  async findById(id: string): Promise<PromoCodeEntity | null> {
    const doc = await this.model.findById(id);
    return doc ? this.toEntity(doc) : null;
  }
}
