import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, Textarea } from '@/shared/ui';
import { fromLocalInput, toLocalInput } from '@/shared/lib';
import { extractErrorMessage } from '@/shared/api';
import { PromoCode, PromoCodeInput } from '@/entities/promocode';
import { promocodeFormSchema, PromoCodeFormValues } from '../model/schema';
import { useCreatePromoCode, useUpdatePromoCode } from '../model/hooks';
import styles from './PromoCodeForm.module.css';

interface PromoCodeFormProps {
  initial?: PromoCode;
  onSuccess: () => void;
  onCancel: () => void;
}

const DISCOUNT_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Процент (%)' },
  { value: 'FIXED', label: 'Фиксированная сумма' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Активен' },
  { value: 'PAUSED', label: 'Пауза' },
  { value: 'EXPIRED', label: 'Истёк' },
];

export function PromoCodeForm({ initial, onSuccess, onCancel }: PromoCodeFormProps) {
  const isEdit = Boolean(initial);
  const create = useCreatePromoCode();
  const update = useUpdatePromoCode();
  const mutation = isEdit ? update : create;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promocodeFormSchema),
    defaultValues: {
      code: initial?.code ?? '',
      description: initial?.description ?? '',
      discountType: initial?.discountType ?? 'PERCENTAGE',
      discountValue: initial?.discountValue ?? 10,
      maxUsages: initial?.maxUsages ?? 0,
      status: initial?.status ?? 'ACTIVE',
      startsAt: toLocalInput(initial?.startsAt) || toLocalInput(new Date().toISOString()),
      expiresAt: toLocalInput(initial?.expiresAt),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload: PromoCodeInput = {
      code: values.code,
      description: values.description ?? '',
      discountType: values.discountType,
      discountValue: values.discountValue,
      maxUsages: values.maxUsages,
      status: values.status,
      startsAt: fromLocalInput(values.startsAt) ?? new Date().toISOString(),
      expiresAt: fromLocalInput(values.expiresAt),
    };

    try {
      if (isEdit && initial) {
        const { code, ...rest } = payload;
        void code;
        await update.mutateAsync({ id: initial.id, input: rest });
      } else {
        await create.mutateAsync(payload);
      }
      onSuccess();
    } catch (err) {
      setError('root', { message: extractErrorMessage(err) });
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      {errors.root && <div className={styles.formError}>{errors.root.message}</div>}

      <Input
        label="Код"
        placeholder="SUMMER25"
        disabled={isEdit}
        error={errors.code?.message}
        {...register('code')}
      />

      <Textarea
        label="Описание"
        placeholder="Необязательное описание"
        error={errors.description?.message}
        {...register('description')}
      />

      <div className={styles.row}>
        <Select
          label="Тип скидки"
          options={DISCOUNT_OPTIONS}
          error={errors.discountType?.message}
          {...register('discountType')}
        />
        <Input
          label="Размер скидки"
          type="number"
          step="0.01"
          error={errors.discountValue?.message}
          {...register('discountValue')}
        />
      </div>

      <div className={styles.row}>
        <Input
          label="Макс. использований (0 = без лимита)"
          type="number"
          error={errors.maxUsages?.message}
          {...register('maxUsages')}
        />
        <Select
          label="Статус"
          options={STATUS_OPTIONS}
          error={errors.status?.message}
          {...register('status')}
        />
      </div>

      <div className={styles.row}>
        <Input
          label="Начало действия"
          type="datetime-local"
          error={errors.startsAt?.message}
          {...register('startsAt')}
        />
        <Input
          label="Истекает (необязательно)"
          type="datetime-local"
          error={errors.expiresAt?.message}
          {...register('expiresAt')}
        />
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={mutation.isPending}>
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}
