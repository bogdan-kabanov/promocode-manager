import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useSyncedMutation } from '@/shared/api/useSyncedMutation';
import type {
  CreatePromoCodeRequest,
  PromoCodeDto,
  UpdatePromoCodeRequest,
} from '@/shared/api/types';
import {
  buildPromoCodesRequest,
  promoCodesApi,
  PromoCodesListParams,
} from './api';

/** Все три списка ниже читаются из ClickHouse и отстают после мутации. */
const PROMOCODE_LIST_KEYS = [
  queryKeys.promocodes,
  queryKeys.analyticsPromocodes,
] as const;

export function usePromoCodesList(params: PromoCodesListParams) {
  const body = buildPromoCodesRequest(params);
  return useQuery({
    queryKey: queryKeys.promocodesList(body),
    queryFn: () => promoCodesApi.fetchMany(body),
    placeholderData: keepPreviousData,
  });
}

/** Форму редактирования заполняет документ из MongoDB, а не строка таблицы. */
export function usePromoCodeDocument(mongoId: string | null) {
  return useQuery({
    queryKey: queryKeys.promocode(mongoId ?? ''),
    queryFn: () => promoCodesApi.fetchOne(mongoId as string),
    enabled: mongoId !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCreatePromoCode(onDone?: () => void) {
  return useSyncedMutation<PromoCodeDto, CreatePromoCodeRequest>({
    mutationFn: (body) => promoCodesApi.create(body),
    syncKeys: PROMOCODE_LIST_KEYS,
    target: (promoCode) => ({
      mongoId: promoCode.mongoId,
      updatedAt: promoCode.updatedAt,
    }),
    successMessage: 'msg.promocode.created',
    onDone,
  });
}

interface UpdatePromoCodeVariables {
  mongoId: string;
  body: UpdatePromoCodeRequest;
}

export function useUpdatePromoCode(onDone?: () => void) {
  return useSyncedMutation<PromoCodeDto, UpdatePromoCodeVariables>({
    mutationFn: ({ mongoId, body }) => promoCodesApi.update(mongoId, body),
    syncKeys: PROMOCODE_LIST_KEYS,
    target: (promoCode) => ({
      mongoId: promoCode.mongoId,
      updatedAt: promoCode.updatedAt,
    }),
    successMessage: 'msg.promocode.updated',
    onDone,
  });
}

export function useSetPromoCodeActive() {
  return useSyncedMutation<PromoCodeDto, { mongoId: string; isActive: boolean }>(
    {
      mutationFn: ({ mongoId, isActive }) =>
        isActive
          ? promoCodesApi.activate(mongoId)
          : promoCodesApi.deactivate(mongoId),
      syncKeys: PROMOCODE_LIST_KEYS,
      target: (promoCode) => ({
        mongoId: promoCode.mongoId,
        updatedAt: promoCode.updatedAt,
      }),
      successMessage: (_promoCode, variables) =>
        variables.isActive
          ? 'msg.promocode.activated'
          : 'msg.promocode.deactivated',
    },
  );
}
