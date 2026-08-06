import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { t, TranslationKey } from '@/shared/i18n';
import { formatPhone } from '@/shared/lib/format';
import { Button } from '@/shared/ui';
import styles from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: TranslationKey;
  icon: string;
}

const SECTIONS: { title: TranslationKey; items: NavItem[] }[] = [
  {
    title: 'nav.section.operations',
    items: [
      { to: '/users', label: 'nav.users', icon: '☺' },
      { to: '/promocodes', label: 'nav.promocodes', icon: '＃' },
      { to: '/orders', label: 'nav.orders', icon: '▤' },
    ],
  },
  {
    title: 'nav.section.analytics',
    items: [
      { to: '/analytics/users', label: 'nav.analytics.users', icon: '☺' },
      {
        to: '/analytics/promocodes',
        label: 'nav.analytics.promocodes',
        icon: '＃',
      },
      { to: '/analytics/usages', label: 'nav.analytics.usages', icon: '↻' },
    ],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>P</div>
        <div>
          <div className={styles.brandName}>{t('app.brand')}</div>
          <div className={styles.brandSub}>{t('app.brandSub')}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {SECTIONS.map((section) => (
          <div key={section.title} className={styles.section}>
            <div className={styles.sectionTitle}>{t(section.title)}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{t(item.label)}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        {user && (
          <div className={styles.account}>
            <div className={styles.accountName}>{user.name}</div>
            <div className={styles.accountPhone}>{formatPhone(user.phone)}</div>
          </div>
        )}
        <Button variant="secondary" size="sm" block onClick={logout}>
          {t('auth.logout')}
        </Button>
      </div>
    </aside>
  );
}
