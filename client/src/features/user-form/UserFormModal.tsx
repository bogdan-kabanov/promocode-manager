import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiErrorText } from '@/shared/api/ApiError';
import { useUpdateUser, useUserDocument } from '@/entities/user';
import { t } from '@/shared/i18n';
import { nameField, phoneField } from '@/features/auth/model/schemas';
import { applyServerFieldErrors } from '@/shared/lib/serverFieldErrors';
import { Button, Input, Modal, Spinner } from '@/shared/ui';
import styles from './UserFormModal.module.css';

const userFormSchema = z.object({
  name: nameField,
  phone: phoneField,
});

type UserFormValues = z.infer<typeof userFormSchema>;

const FIELDS = ['name', 'phone'] as const;

interface UserFormModalProps {
  open: boolean;
  mongoId: string | null;
  onClose: () => void;
}

export function UserFormModal({ open, mongoId, onClose }: UserFormModalProps) {
  const document = useUserDocument(open ? mongoId : null);
  const updateMutation = useUpdateUser(onClose);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    mode: 'onTouched',
    defaultValues: { name: '', phone: '' },
  });

  // Форму заполняет документ из MongoDB, а не строка загруженной таблицы.
  useEffect(() => {
    if (open && document.data) {
      reset({ name: document.data.name, phone: document.data.phone });
    }
  }, [document.data, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (mongoId === null) return;
    try {
      await updateMutation.mutateAsync({ mongoId, body: values });
    } catch (error) {
      applyServerFieldErrors(error, setError, FIELDS);
    }
  });

  const busy = isSubmitting || updateMutation.isPending;

  return (
    <Modal open={open} title={t('userForm.edit.title')} onClose={onClose}>
      {document.isPending ? (
        <div className={styles.center}>
          <Spinner />
          <span className={styles.stateText}>{t('state.loading')}</span>
        </div>
      ) : document.isError ? (
        <div className={styles.center}>
          <div className={styles.stateTitle}>{t('state.error.title')}</div>
          <span className={styles.stateText}>
            {apiErrorText(document.error)}
          </span>
          <Button onClick={() => void document.refetch()}>
            {t('action.retry')}
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <Input
            label={t('field.name')}
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label={t('field.phone')}
            hint={t('auth.phoneHint')}
            inputMode="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" disabled={!isValid || busy}>
              {t('action.save')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
