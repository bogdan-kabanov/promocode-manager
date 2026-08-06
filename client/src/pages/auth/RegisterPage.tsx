import { Link, useNavigate } from 'react-router-dom';
import { DEFAULT_AUTHENTICATED_ROUTE, RegisterForm } from '@/features/auth';
import { t } from '@/shared/i18n';
import { AuthShell } from './AuthShell';

export function RegisterPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title={t('page.register.title')}
      subtitle={t('page.register.subtitle')}
      footer={<Link to="/login">{t('auth.toLogin')}</Link>}
    >
      <RegisterForm
        onSuccess={() =>
          navigate(DEFAULT_AUTHENTICATED_ROUTE, { replace: true })
        }
      />
    </AuthShell>
  );
}
