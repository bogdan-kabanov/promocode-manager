import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../../common/errors';
import { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

export const IS_PUBLIC_KEY = 'isPublicRoute';

/** Marks a route as reachable without a Bearer access token. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authUser) throw BusinessException.unauthorized(ErrorCode.UNAUTHORIZED);
    return request.authUser;
  },
);
