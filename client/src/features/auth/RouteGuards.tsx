import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const DEFAULT_AUTHENTICATED_ROUTE = '/promocodes';

/** Без действительного токена пользователь уходит на вход, а адрес сохраняется. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const target = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/login?next=${encodeURIComponent(target)}`} replace />
    );
  }

  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />;
  }
  return <Outlet />;
}
