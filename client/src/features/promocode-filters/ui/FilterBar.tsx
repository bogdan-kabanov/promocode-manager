import { Button } from '@/shared/ui';
import { PromoCodeStatus } from '@/entities/promocode';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  search: string;
  status: PromoCodeStatus | '';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PromoCodeStatus | '') => void;
  onCreate: () => void;
}

export function FilterBar({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onCreate,
}: FilterBarProps) {
  return (
    <div className={styles.bar}>
      <input
        className={styles.search}
        placeholder="Поиск по коду или описанию…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select
        className={styles.status}
        value={status}
        onChange={(e) => onStatusChange(e.target.value as PromoCodeStatus | '')}
      >
        <option value="">Все статусы</option>
        <option value="ACTIVE">Активные</option>
        <option value="PAUSED">На паузе</option>
        <option value="EXPIRED">Истёкшие</option>
      </select>
      <Button onClick={onCreate}>+ Новый промокод</Button>
    </div>
  );
}
