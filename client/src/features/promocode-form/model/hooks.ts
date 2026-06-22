import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promocodeApi, PromoCode, PromoCodeInput } from '@/entities/promocode';
import { queryKeys } from '@/shared/api/queryKeys';

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.promocodes });
    qc.invalidateQueries({ queryKey: queryKeys.analyticsSummary });
  };
}

export function useCreatePromoCode() {
  const invalidate = useInvalidateAll();
  return useMutation<PromoCode, unknown, PromoCodeInput>({
    mutationFn: (input) => promocodeApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePromoCode() {
  const invalidate = useInvalidateAll();
  return useMutation<
    PromoCode,
    unknown,
    { id: string; input: Partial<PromoCodeInput> }
  >({
    mutationFn: ({ id, input }) => promocodeApi.update(id, input),
    onSuccess: invalidate,
  });
}
