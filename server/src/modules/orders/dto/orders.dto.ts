import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ListRequestDto } from '../../../common/dto/list-request.dto';
import { IsApiMoney, IsPromocodeCode } from '../../../common/validators';

export const ORDER_SORT_FIELDS = ['createdAt', 'amount', 'finalAmount'] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

export class FetchOrdersDto extends ListRequestDto {
  @IsOptional()
  @IsIn(ORDER_SORT_FIELDS)
  sortBy: OrderSortField = 'createdAt';

  @IsOptional()
  @IsBoolean()
  hasPromocode?: boolean;
}

/** The owner is taken from the access token; sending it is a 400. */
export class CreateOrderDto {
  @IsApiMoney()
  amount!: number;
}

/** Only the code is accepted; sending `amount` here is a 400. */
export class ApplyPromocodeDto {
  @IsString()
  @IsPromocodeCode()
  code!: string;
}
