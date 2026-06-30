import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class RedeemPromoCodeDto {
  /**
   * Optional order amount the promo code is applied to.
   * Required to compute a meaningful discount for PERCENTAGE codes.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderAmount?: number;
}
