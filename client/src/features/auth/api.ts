import { apiPost } from '@/shared/api/http';
import type {
  LoginRequest,
  LoginResponseDto,
  RegisterRequest,
  UserDto,
} from '@/shared/api/types';

export const authApi = {
  register: (body: RegisterRequest) =>
    apiPost<UserDto, RegisterRequest>('/auth/register', body, {
      skipAuth: true,
    }),
  login: (body: LoginRequest) =>
    apiPost<LoginResponseDto, LoginRequest>('/auth/login', body, {
      skipAuth: true,
    }),
};
