import type { Request } from 'express';

export interface AuthenticatedUser {
  mongoId: string;
  phone: string;
  name: string;
}

export interface AccessTokenPayload {
  sub: string;
  phone: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}
