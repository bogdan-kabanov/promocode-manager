import { t } from '@/shared/i18n';
import { Badge } from '@/shared/ui/Badge/Badge';

export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge tone={isActive ? 'green' : 'neutral'}>
      {t(isActive ? 'userStatus.active' : 'userStatus.inactive')}
    </Badge>
  );
}
