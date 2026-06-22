import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/', label: 'Дэшборд', icon: '◧', end: true },
  { to: '/promocodes', label: 'Промокоды', icon: '＃' },
  { to: '/redemptions', label: 'Использования', icon: '↻' },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>P</div>
        <div>
          <div className={styles.brandName}>PromoCode</div>
          <div className={styles.brandSub}>Manager</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>CQRS · Mongo → ClickHouse</div>
    </aside>
  );
}
