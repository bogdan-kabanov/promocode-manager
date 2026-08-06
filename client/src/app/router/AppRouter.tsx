import { Navigate, Route, Routes } from 'react-router-dom';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  RedirectIfAuthenticated,
  RequireAuth,
} from '@/features/auth';
import { AppLayout } from '../layout/AppLayout';
import { AnalyticsPromoCodesPage } from '@/pages/analytics/AnalyticsPromoCodesPage';
import { AnalyticsUsagesPage } from '@/pages/analytics/AnalyticsUsagesPage';
import { AnalyticsUsersPage } from '@/pages/analytics/AnalyticsUsersPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { OrdersPage } from '@/pages/orders/OrdersPage';
import { PromoCodesPage } from '@/pages/promocodes/PromoCodesPage';
import { UsersPage } from '@/pages/users/UsersPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={<Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />}
          />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/promocodes" element={<PromoCodesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/analytics/users" element={<AnalyticsUsersPage />} />
          <Route
            path="/analytics/promocodes"
            element={<AnalyticsPromoCodesPage />}
          />
          <Route path="/analytics/usages" element={<AnalyticsUsagesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
