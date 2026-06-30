import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promocodeApi, PromoCode } from '@/entities/promocode';
import { queryKeys } from '@/shared/api/queryKeys';

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.promocodes });
    qc.invalidateQueries({ queryKey: queryKeys.analyticsSummary });
    qc.invalidateQueries({ queryKey: queryKeys.redemptions });
  };
}

export function useDeletePromoCode() {
  const invalidate = useInvalidateAll();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => promocodeApi.remove(id),
    onSuccess: invalidate,
  });
}

export function useRedeemPromoCode() {
  const invalidate = useInvalidateAll();
  return useMutation<PromoCode, unknown, { id: string; orderAmount?: number }>({
    mutationFn: ({ id, orderAmount }) => promocodeApi.redeem(id, orderAmount),
    onSuccess: invalidate,
  });
}
