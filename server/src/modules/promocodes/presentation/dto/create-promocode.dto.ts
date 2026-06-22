import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

export class CreatePromoCodeDto {
  @IsString()
  @Length(3, 32)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsInt()
  @Min(0)
  maxUsages!: number;

  @IsEnum(PromoCodeStatus)
  status!: PromoCodeStatus;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;
}
