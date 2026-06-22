import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import {
  DashboardPage,
  PromoCodesPage,
  RedemptionsPage,
} from '@/pages';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'promocodes', element: <PromoCodesPage /> },
      { path: 'redemptions', element: <RedemptionsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
