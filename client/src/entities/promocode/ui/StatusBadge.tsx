import { Badge } from '@/shared/ui';
import { PromoCodeStatus, STATUS_LABELS } from '../model/types';

const TONE: Record<PromoCodeStatus, 'green' | 'amber' | 'red'> = {
  ACTIVE: 'green',
  PAUSED: 'amber',
  EXPIRED: 'red',
};

export function StatusBadge({ status }: { status: PromoCodeStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}
