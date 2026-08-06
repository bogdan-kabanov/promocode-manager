import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

export interface CreateUserInput {
  phone: string;
  phoneDigits: string;
  name: string;
  passwordHash: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  phoneDigits?: string;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly model: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.model.findOne({ phone }).exec();
  }

  async create(input: CreateUserInput): Promise<UserDocument> {
    return this.model.create({
      phone: input.phone,
      phoneDigits: input.phoneDigits,
      name: input.name,
      passwordHash: input.passwordHash,
      isActive: input.isActive ?? true,
    });
  }

  /**
   * Seed-only. Mongoose keeps an explicitly provided `createdAt` / `updatedAt`,
   * so the demo data can live in the past.
   */
  async createManyWithTimestamps(inputs: Required<CreateUserInput>[]): Promise<UserDocument[]> {
    return this.model.insertMany(inputs);
  }

  async update(id: string, input: UpdateUserInput): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(id, { $set: input }, { new: true }).exec();
  }

  async setActive(id: string, isActive: boolean): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).exec();
  }

  async count(): Promise<number> {
    return this.model.countDocuments().exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.model.find().exec();
  }
}
