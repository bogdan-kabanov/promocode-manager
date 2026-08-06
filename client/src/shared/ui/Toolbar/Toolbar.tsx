import { ReactNode } from 'react';
import styles from './Toolbar.module.css';

/** Полоса фильтров над таблицей. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}

export function ToolbarItem({
  children,
  grow = false,
}: {
  children: ReactNode;
  grow?: boolean;
}) {
  return (
    <div className={`${styles.item} ${grow ? styles.grow : ''}`}>{children}</div>
  );
}
