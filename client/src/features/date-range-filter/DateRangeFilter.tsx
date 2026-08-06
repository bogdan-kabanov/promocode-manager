import { t, TranslationKey } from '@/shared/i18n';
import type { DatePreset } from '@/shared/lib/dateRange';
import type { DateRangeUrlState } from '@/shared/lib/useDateRangeUrlState';
import styles from './DateRangeFilter.module.css';

const PRESET_OPTIONS: { value: DatePreset | null; label: TranslationKey }[] = [
  { value: null, label: 'dateFilter.preset.none' },
  { value: 'today', label: 'dateFilter.preset.today' },
  { value: 'last7', label: 'dateFilter.preset.last7' },
  { value: 'last30', label: 'dateFilter.preset.last30' },
  { value: 'custom', label: 'dateFilter.preset.custom' },
];

/**
 * Единый фильтр дат трёх аналитических витрин. Границы считает клиент
 * по местной полуночи и передаёт серверу в нулевом смещении.
 */
export function DateRangeFilter({ state }: { state: DateRangeUrlState }) {
  const { value, isValid, setPreset, setCustomDay } = state;

  return (
    <div className={styles.filter}>
      <div className={styles.head}>
        <span className={styles.label}>{t('dateFilter.label')}</span>
        <span className={styles.hint}>{t('dateFilter.hint')}</span>
      </div>

      <div className={styles.presets}>
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`${styles.preset} ${
              value.preset === option.value ? styles.presetActive : ''
            }`}
            onClick={() => setPreset(option.value)}
          >
            {t(option.label)}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className={styles.custom}>
          <label className={styles.dayField}>
            <span className={styles.dayLabel}>{t('dateFilter.from')}</span>
            <input
              className={styles.day}
              type="date"
              value={value.from ?? ''}
              onChange={(event) => setCustomDay('from', event.target.value)}
            />
          </label>
          <label className={styles.dayField}>
            <span className={styles.dayLabel}>{t('dateFilter.to')}</span>
            <input
              className={styles.day}
              type="date"
              value={value.to ?? ''}
              onChange={(event) => setCustomDay('to', event.target.value)}
            />
          </label>
        </div>
      )}

      {!isValid && (
        <div className={styles.invalid}>{t('dateFilter.invalid')}</div>
      )}
    </div>
  );
}
