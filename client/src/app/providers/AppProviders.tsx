import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { QUERY_RETRY_COUNT, QUERY_RETRY_DELAY_MS } from '@/shared/config';
import { ToastProvider } from '@/shared/ui';

/**
 * Одна повторная попытка с коротким интервалом: вместе с таймаутом запроса
 * это удерживает показ ошибки в пределах десяти секунд.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QUERY_RETRY_COUNT,
      retryDelay: QUERY_RETRY_DELAY_MS,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>{children}</AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
