import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PROMOCODE_PATTERN } from '@/shared/config';
import type { OrderDto } from '@/shared/api/types';
import { useApplyPromoCode } from '@/entities/order';
import { t } from '@/shared/i18n';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { applyServerFieldErrors } from '@/shared/lib/serverFieldErrors';
import { Button, Input, Modal } from '@/shared/ui';
import styles from './ApplyPromoCodeModal.module.css';

const applyFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .refine(
      (value) => PROMOCODE_PATTERN.test(value.toUpperCase()),
      t('validation.code.pattern'),
    ),
});

type ApplyFormValues = z.infer<typeof applyFormSchema>;

interface ApplyPromoCodeModalProps {
  order: OrderDto | null;
  onClose: () => void;
}

/** Промокод применяется к уже существующему заказу; сумма берётся из заказа. */
export function ApplyPromoCodeModal({
  order,
  onClose,
}: ApplyPromoCodeModalProps) {
  const applyMutation = useApplyPromoCode(onClose);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applyFormSchema),
    mode: 'onTouched',
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (order) reset({ code: '' });
  }, [order, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!order) return;
    try {
      await applyMutation.mutateAsync({
        mongoId: order.mongoId,
        code: values.code.trim().toUpperCase(),
      });
    } catch (error) {
      applyServerFieldErrors(error, setError, ['code']);
    }
  });

  const busy = isSubmitting || applyMutation.isPending;

  return (
    <Modal open={order !== null} title={t('applyForm.title')} onClose={onClose}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {order && (
          <div className={styles.summary}>
            {t('applyForm.orderSummary', {
              createdAt: formatDateTime(order.createdAt),
              amount: formatMoney(order.amount),
            })}
          </div>
        )}

        <Input
          label={t('field.promocode')}
          autoCapitalize="characters"
          hint={t('applyForm.codeHint')}
          error={errors.code?.message}
          {...register('code')}
        />

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('action.cancel')}
          </Button>
          <Button type="submit" disabled={!isValid || busy}>
            {t('action.apply')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
