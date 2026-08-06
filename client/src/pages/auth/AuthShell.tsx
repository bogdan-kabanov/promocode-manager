import { ReactNode } from 'react';
import { t } from '@/shared/i18n';
import { Card } from '@/shared/ui';
import styles from './AuthPage.module.css';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className={styles.screen}>
      <Card className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>P</div>
          <div>
            <div className={styles.brandName}>{t('app.brand')}</div>
            <div className={styles.brandSub}>{t('app.brandSub')}</div>
          </div>
        </div>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {children}

        <div className={styles.switch}>{footer}</div>
      </Card>
    </div>
  );
}
