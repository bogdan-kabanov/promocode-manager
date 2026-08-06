import { PROMOCODE_STATES, type PromoCodeState } from '@/shared/api/types';
import { t, TranslationKey } from '@/shared/i18n';
import { Select, SelectOption } from '@/shared/ui';

const ALL = '';

/**
 * Скрытого фильтра «только активные» нет: по умолчанию видны все записи,
 * а отбор по состоянию включает пользователь.
 */
export function StateFilter({
  value,
  onChange,
}: {
  value: PromoCodeState | null;
  onChange: (value: PromoCodeState | null) => void;
}) {
  const options: SelectOption[] = [
    { value: ALL, label: t('filter.all') },
    ...PROMOCODE_STATES.map((state) => ({
      value: state,
      label: t(`promocodeState.${state}` as TranslationKey),
    })),
  ];

  return (
    <Select
      label={t('field.state')}
      options={options}
      value={value ?? ALL}
      onChange={(event) =>
        onChange(
          event.target.value === ALL
            ? null
            : (event.target.value as PromoCodeState),
        )
      }
    />
  );
}

export function BooleanFilter({
  label,
  value,
  trueLabel,
  falseLabel,
  onChange,
}: {
  label: string;
  value: boolean | null;
  trueLabel: string;
  falseLabel: string;
  onChange: (value: boolean | null) => void;
}) {
  const options: SelectOption[] = [
    { value: ALL, label: t('filter.all') },
    { value: 'true', label: trueLabel },
    { value: 'false', label: falseLabel },
  ];

  return (
    <Select
      label={label}
      options={options}
      value={value === null ? ALL : String(value)}
      onChange={(event) =>
        onChange(
          event.target.value === ALL ? null : event.target.value === 'true',
        )
      }
    />
  );
}
