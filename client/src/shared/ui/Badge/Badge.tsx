import { ReactNode } from 'react';
import styles from './Badge.module.css';

type Tone = 'green' | 'amber' | 'red' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
