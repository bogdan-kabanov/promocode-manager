import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiErrorText } from '@/shared/api/ApiError';
import { t } from '@/shared/i18n';
import { applyServerFieldErrors } from '@/shared/lib/serverFieldErrors';
import { Button, Input } from '@/shared/ui';
import { useAuth } from '../AuthProvider';
import { registerSchema, RegisterFormValues } from '../model/schemas';
import styles from './AuthForm.module.css';

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register: signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { name: '', phone: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signUp(values);
      onSuccess();
    } catch (error) {
      applyServerFieldErrors(error, setError, ['name', 'phone', 'password']);
      setFormError(apiErrorText(error));
    }
  });

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <div className={styles.alert}>{formError}</div>}

      <Input
        label={t('field.name')}
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
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
        autoComplete="new-password"
        hint={t('auth.passwordHint')}
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" block disabled={!isValid || isSubmitting}>
        {t('auth.register.submit')}
      </Button>
    </form>
  );
}
