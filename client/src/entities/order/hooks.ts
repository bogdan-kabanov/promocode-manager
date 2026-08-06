import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useSyncedMutation } from '@/shared/api/useSyncedMutation';
import type { CreateOrderRequest, OrderDto } from '@/shared/api/types';
import { buildOrdersRequest, ordersApi, OrdersListParams } from './api';

export function useOrdersList(params: OrdersListParams) {
  const body = buildOrdersRequest(params);
  return useQuery({
    queryKey: queryKeys.ordersList(body),
    queryFn: () => ordersApi.fetchMany(body),
    placeholderData: keepPreviousData,
  });
}

export function useCreateOrder(onDone?: () => void) {
  return useSyncedMutation<OrderDto, CreateOrderRequest>({
    mutationFn: (body) => ordersApi.create(body),
    syncKeys: [queryKeys.orders, queryKeys.analyticsUsers],
    target: (order) => ({
      mongoId: order.mongoId,
      updatedAt: order.updatedAt,
    }),
    successMessage: 'msg.order.created',
    onDone,
  });
}

interface ApplyPromoCodeVariables {
  mongoId: string;
  code: string;
}

/**
 * Применение промокода меняет заказ, счётчик промокода и все три витрины —
 * перечитываются они все.
 */
export function useApplyPromoCode(onDone?: () => void) {
  return useSyncedMutation<OrderDto, ApplyPromoCodeVariables>({
    mutationFn: ({ mongoId, code }) =>
      ordersApi.applyPromoCode(mongoId, { code }),
    syncKeys: [
      queryKeys.orders,
      queryKeys.promocodes,
      queryKeys.analyticsUsers,
      queryKeys.analyticsPromocodes,
      queryKeys.analyticsUsages,
    ],
    target: (order) => ({
      mongoId: order.mongoId,
      updatedAt: order.updatedAt,
    }),
    successMessage: 'msg.order.promocodeApplied',
    onDone,
  });
}
