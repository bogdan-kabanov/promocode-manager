import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiErrorText } from '@/shared/api/ApiError';
import type {
  CreatePromoCodeRequest,
  PromoCodeDto,
  UpdatePromoCodeRequest,
} from '@/shared/api/types';
import {
  useCreatePromoCode,
  usePromoCodeDocument,
  useUpdatePromoCode,
} from '@/entities/promocode';
import { t } from '@/shared/i18n';
import { isoToLocalInput, localInputToIso } from '@/shared/lib/format';
import { applyServerFieldErrors } from '@/shared/lib/serverFieldErrors';
import { Button, Input, Modal, Spinner } from '@/shared/ui';
import {
  EMPTY_PROMOCODE_FORM,
  promoCodeFormSchema,
  PromoCodeFormValues,
} from '../model/schema';
import styles from './PromoCodeFormModal.module.css';

const FIELDS = [
  'code',
  'discountPercent',
  'maxUsagesTotal',
  'maxUsagesPerUser',
  'validFrom',
  'validUntil',
] as const;

function toFormValues(promoCode: PromoCodeDto): PromoCodeFormValues {
  return {
    code: promoCode.code,
    discountPercent: String(promoCode.discountPercent),
    maxUsagesTotal:
      promoCode.maxUsagesTotal === null ? '' : String(promoCode.maxUsagesTotal),
    maxUsagesPerUser:
      promoCode.maxUsagesPerUser === null
        ? ''
        : String(promoCode.maxUsagesPerUser),
    validFrom: isoToLocalInput(promoCode.validFrom),
    validUntil: isoToLocalInput(promoCode.validUntil),
  };
}

function toLimit(value: string): number | null {
  return value === '' ? null : Number(value);
}

interface PromoCodeFormModalProps {
  open: boolean;
  /** null — создание нового промокода. */
  mongoId: string | null;
  onClose: () => void;
}

export function PromoCodeFormModal({
  open,
  mongoId,
  onClose,
}: PromoCodeFormModalProps) {
  const isEdit = mongoId !== null;
  const document = usePromoCodeDocument(open && isEdit ? mongoId : null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeFormSchema),
    mode: 'onTouched',
    defaultValues: EMPTY_PROMOCODE_FORM,
  });

  const createMutation = useCreatePromoCode(onClose);
  const updateMutation = useUpdatePromoCode(onClose);

  // Форму заполняет документ из MongoDB, а не строка загруженной таблицы.
  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      reset(EMPTY_PROMOCODE_FORM);
      return;
    }
    if (document.data) reset(toFormValues(document.data));
  }, [document.data, isEdit, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: UpdatePromoCodeRequest = {
      discountPercent: Number(values.discountPercent),
      maxUsagesTotal: toLimit(values.maxUsagesTotal),
      maxUsagesPerUser: toLimit(values.maxUsagesPerUser),
      validFrom: localInputToIso(values.validFrom),
      validUntil: localInputToIso(values.validUntil),
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ mongoId, body: payload });
      } else {
        const created: CreatePromoCodeRequest = {
          code: values.code.trim().toUpperCase(),
          ...payload,
        };
        await createMutation.mutateAsync(created);
      }
    } catch (error) {
      applyServerFieldErrors(error, setError, FIELDS);
    }
  });

  const busy = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'promocodeForm.edit.title' : 'promocodeForm.create.title')}
      onClose={onClose}
    >
      {isEdit && document.isPending ? (
        <div className={styles.center}>
          <Spinner />
          <span className={styles.stateText}>{t('state.loading')}</span>
        </div>
      ) : isEdit && document.isError ? (
        <div className={styles.center}>
          <div className={styles.stateTitle}>{t('state.error.title')}</div>
          <span className={styles.stateText}>{apiErrorText(document.error)}</span>
          <Button onClick={() => void document.refetch()}>
            {t('action.retry')}
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <Input
            label={t('field.code')}
            disabled={isEdit}
            hint={t(isEdit ? 'promocodeForm.codeLocked' : 'promocodeForm.codeHint')}
            error={errors.code?.message}
            {...register('code')}
          />
          <Input
            label={t('field.discountPercent')}
            inputMode="numeric"
            error={errors.discountPercent?.message}
            {...register('discountPercent')}
          />

          <div className={styles.row}>
            <Input
              label={t('field.maxUsagesTotal')}
              inputMode="numeric"
              hint={t('promocodeForm.limitHint')}
              error={errors.maxUsagesTotal?.message}
              {...register('maxUsagesTotal')}
            />
            <Input
              label={t('field.maxUsagesPerUser')}
              inputMode="numeric"
              hint={t('promocodeForm.limitHint')}
              error={errors.maxUsagesPerUser?.message}
              {...register('maxUsagesPerUser')}
            />
          </div>

          <div className={styles.row}>
            <Input
              label={t('field.validFrom')}
              type="datetime-local"
              hint={t('promocodeForm.validFromHint')}
              error={errors.validFrom?.message}
              {...register('validFrom')}
            />
            <Input
              label={t('field.validUntil')}
              type="datetime-local"
              hint={t('promocodeForm.validUntilHint')}
              error={errors.validUntil?.message}
              {...register('validUntil')}
            />
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || busy}>
              {t(isEdit ? 'action.save' : 'action.create')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
