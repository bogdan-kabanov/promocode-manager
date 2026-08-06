import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG, AppConfig } from '../../config/configuration';
import { BusinessException, ErrorCode } from '../../common/errors';
import { UsersRepository } from '../users/users.repository';
import { IS_PUBLIC_KEY } from './auth.decorators';
import { AccessTokenPayload, AuthenticatedRequest } from './auth.types';

/** Global guard: every route needs a Bearer access token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw BusinessException.unauthorized(ErrorCode.UNAUTHORIZED);
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(header.slice('Bearer '.length), {
        secret: this.config.jwt.accessSecret,
      });
    } catch {
      throw BusinessException.unauthorized(ErrorCode.UNAUTHORIZED);
    }
    if (payload.type !== 'access') {
      throw BusinessException.unauthorized(ErrorCode.UNAUTHORIZED);
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw BusinessException.unauthorized(ErrorCode.UNAUTHORIZED);
    // A deactivated user is rejected immediately, even with a still-valid token.
    if (!user.isActive) throw BusinessException.unauthorized(ErrorCode.USER_DISABLED);

    request.authUser = { mongoId: user.id as string, phone: user.phone, name: user.name };
    return true;
  }
}
