import { IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ListRequestDto } from '../../../common/dto/list-request.dto';
import { IsRuMobilePhone } from '../../../common/validators';

export const USER_SORT_FIELDS = ['name', 'phone', 'createdAt'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class FetchUsersDto extends ListRequestDto {
  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  sortBy: UserSortField = 'createdAt';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Only `name` and `phone` are updatable; anything else is rejected with 400. */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsRuMobilePhone()
  phone?: string;
}
