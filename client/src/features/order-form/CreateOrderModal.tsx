import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AMOUNT_MAX } from '@/shared/config';
import { useCreateOrder } from '@/entities/order';
import { t } from '@/shared/i18n';
import { applyServerFieldErrors } from '@/shared/lib/serverFieldErrors';
import { Button, Input, Modal } from '@/shared/ui';
import styles from './CreateOrderModal.module.css';

const AMOUNT_SHAPE = /^\d+(?:[.,]\d+)?$/;

const orderFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .superRefine((value, context) => {
      if (!AMOUNT_SHAPE.test(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.amount.invalid'),
        });
        return;
      }
      const normalized = value.replace(',', '.');
      const [, fraction = ''] = normalized.split('.');
      if (fraction.length > 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.amount.scale'),
        });
        return;
      }
      const parsed = Number(normalized);
      if (parsed <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.amount.positive'),
        });
        return;
      }
      if (parsed > AMOUNT_MAX) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.amount.max'),
        });
      }
    }),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export function CreateOrderModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createMutation = useCreateOrder(onClose);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onTouched',
    defaultValues: { amount: '' },
  });

  useEffect(() => {
    if (open) reset({ amount: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        amount: Number(values.amount.replace(',', '.')),
      });
    } catch (error) {
      applyServerFieldErrors(error, setError, ['amount']);
    }
  });

  const busy = isSubmitting || createMutation.isPending;

  return (
    <Modal open={open} title={t('orderForm.create.title')} onClose={onClose}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <Input
          label={t('field.amount')}
          inputMode="decimal"
          hint={t('orderForm.amountHint')}
          error={errors.amount?.message}
          {...register('amount')}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('action.cancel')}
          </Button>
          <Button type="submit" disabled={!isValid || busy}>
            {t('action.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
