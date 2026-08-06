import { IsString, Length, MaxLength, MinLength } from 'class-validator';
import { IsRuMobilePhone } from '../../../common/validators';

export class RegisterDto {
  @IsString()
  @IsRuMobilePhone()
  phone!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class LoginDto {
  @IsString()
  @IsRuMobilePhone()
  phone!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
