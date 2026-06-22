import { PromoCode } from '../../domain/promocode.schema';
import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

export interface CreatePromoCodeData {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsages: number;
  status: PromoCodeStatus;
  startsAt: Date;
  expiresAt: Date | null;
}

export type UpdatePromoCodeData = Partial<Omit<CreatePromoCodeData, 'code'>>;

export interface PromoCodeEntity extends PromoCode {
  id: string;
}

export interface PromoCodeWriteRepository {
  create(data: CreatePromoCodeData): Promise<PromoCodeEntity>;
  update(id: string, data: UpdatePromoCodeData): Promise<PromoCodeEntity | null>;
  delete(id: string): Promise<PromoCodeEntity | null>;
  incrementUsage(id: string): Promise<PromoCodeEntity | null>;
  findById(id: string): Promise<PromoCodeEntity | null>;
}

export const PROMOCODE_WRITE_REPOSITORY = Symbol('PROMOCODE_WRITE_REPOSITORY');
