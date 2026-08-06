import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthResponse, AuthService } from './auth.service';
import { Public } from './auth.decorators';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

/** The only public endpoints besides GET /health. */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.auth.refresh(dto);
  }
}
