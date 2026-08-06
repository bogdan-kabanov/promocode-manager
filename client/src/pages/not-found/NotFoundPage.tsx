import { Link } from 'react-router-dom';
import { DEFAULT_AUTHENTICATED_ROUTE } from '@/features/auth';
import { t } from '@/shared/i18n';
import { PageHeader } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title={t('page.notFound.title')} />
      <Link to={DEFAULT_AUTHENTICATED_ROUTE}>{t('page.notFound.action')}</Link>
    </>
  );
}
