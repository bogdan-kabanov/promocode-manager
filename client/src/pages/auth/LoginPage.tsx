import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_AUTHENTICATED_ROUTE, LoginForm } from '@/features/auth';
import { t } from '@/shared/i18n';
import { AuthShell } from './AuthShell';

/** Целевой адрес защищённого маршрута сохраняется в параметре `next`. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }
  return raw;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  return (
    <AuthShell
      title={t('page.login.title')}
      subtitle={t('page.login.subtitle')}
      footer={<Link to="/register">{t('auth.toRegister')}</Link>}
    >
      <LoginForm onSuccess={() => navigate(next, { replace: true })} />
    </AuthShell>
  );
}
