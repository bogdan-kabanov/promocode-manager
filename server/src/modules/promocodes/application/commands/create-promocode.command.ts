import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

export class CreatePromoCodeCommand {
  constructor(
    public readonly code: string,
    public readonly description: string,
    public readonly discountType: DiscountType,
    public readonly discountValue: number,
    public readonly maxUsages: number,
    public readonly status: PromoCodeStatus,
    public readonly startsAt: Date,
    public readonly expiresAt: Date | null,
  ) {}
}
