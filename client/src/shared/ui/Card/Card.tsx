import { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`${styles.card} ${padded ? styles.padded : ''} ${className}`}
      {...rest}
    />
  );
}
