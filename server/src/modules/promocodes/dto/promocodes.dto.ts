import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ListRequestDto } from '../../../common/dto/list-request.dto';
import { IsPromocodeCode } from '../../../common/validators';
import { PROMOCODE_STATES, PromocodeState } from '../promocode-state';

export const PROMOCODE_SORT_FIELDS = [
  'code',
  'discountPercent',
  'usedCount',
  'validUntil',
  'createdAt',
] as const;
export type PromocodeSortField = (typeof PROMOCODE_SORT_FIELDS)[number];

export class FetchPromocodesDto extends ListRequestDto {
  @IsOptional()
  @IsIn(PROMOCODE_SORT_FIELDS)
  sortBy: PromocodeSortField = 'createdAt';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @IsOptional()
  @IsIn(PROMOCODE_STATES)
  state?: PromocodeState;
}

/**
 * `null` clears an optional limit / boundary; omitting the field leaves it
 * untouched. `@IsOptional()` accepts both `null` and `undefined`.
 */
export class CreatePromocodeDto {
  @IsString()
  @IsPromocodeCode()
  code!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsagesTotal?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsagesPerUser?: number | null;

  @IsOptional()
  @IsISO8601()
  validFrom?: string | null;

  @IsOptional()
  @IsISO8601()
  validUntil?: string | null;
}

/** `code`, `isActive` and `usedCount` are immutable through this endpoint. */
export class UpdatePromocodeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsagesTotal?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsagesPerUser?: number | null;

  @IsOptional()
  @IsISO8601()
  validFrom?: string | null;

  @IsOptional()
  @IsISO8601()
  validUntil?: string | null;
}
