import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiErrorText, toApiError } from '@/shared/api/ApiError';
import { t } from '@/shared/i18n';
import { applyServerFieldErrors } from '@/shared/lib/serverFieldErrors';
import { Button, Input } from '@/shared/ui';
import { useAuth } from '../AuthProvider';
import { loginSchema, LoginFormValues } from '../model/schemas';
import styles from './AuthForm.module.css';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      onSuccess();
    } catch (error) {
      applyServerFieldErrors(error, setError, ['phone', 'password']);
      const apiError = toApiError(error);
      setFormError(
        apiError.status === 401 && apiError.code === null
          ? t('error.credentials')
          : apiErrorText(error),
      );
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <div className={styles.alert}>{formError}</div>}

      <Input
        label={t('field.phone')}
        hint={t('auth.phoneHint')}
        autoComplete="tel"
        inputMode="tel"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Input
        label={t('field.password')}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" block disabled={!isValid || isSubmitting}>
        {t('auth.login.submit')}
      </Button>
    </form>
  );
}
