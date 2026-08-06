import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onAuthFailure } from '@/shared/api/http';
import { tokenStorage } from '@/shared/api/tokenStorage';
import type {
  LoginRequest,
  RegisterRequest,
  UserDto,
} from '@/shared/api/types';
import { t, tErrorCode } from '@/shared/i18n';
import { useToast } from '@/shared/ui/Toast/ToastProvider';
import { authApi } from './api';

interface AuthContextValue {
  user: UserDto | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [user, setUser] = useState<UserDto | null>(() =>
    tokenStorage.getAccessToken() ? tokenStorage.getUser() : null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => tokenStorage.getAccessToken() !== null,
  );

  const dropSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    queryClient.clear();
  }, [queryClient]);

  // Просроченный токен и деактивированная учётная запись возвращают на вход.
  useEffect(
    () =>
      onAuthFailure((reason) => {
        notify(
          reason === 'disabled'
            ? (tErrorCode('USER_DISABLED') ?? t('error.unauthorized'))
            : t('error.unauthorized'),
          'error',
        );
        dropSession();
      }),
    [dropSession, notify],
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const session = await authApi.login(credentials);
      tokenStorage.setTokens(session.accessToken, session.refreshToken);
      tokenStorage.setUser(session.user);
      queryClient.clear();
      setUser(session.user);
      setIsAuthenticated(true);
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      await authApi.register(payload);
      await login({ phone: payload.phone, password: payload.password });
    },
    [login],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated, login, register, logout: dropSession }),
    [dropSession, isAuthenticated, login, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
