import { t, TranslationKey } from '@/shared/i18n';
import { Badge } from '@/shared/ui/Badge/Badge';
import type { PromoCodeState } from '@/shared/api/types';

type Tone = 'green' | 'amber' | 'red' | 'neutral';

const TONES: Record<PromoCodeState, Tone> = {
  ACTIVE: 'green',
  SCHEDULED: 'amber',
  EXPIRED: 'red',
  EXHAUSTED: 'red',
  DISABLED: 'neutral',
};

export function PromoCodeStateBadge({ state }: { state: PromoCodeState }) {
  const key = `promocodeState.${state}` as TranslationKey;
  return <Badge tone={TONES[state]}>{t(key)}</Badge>;
}
