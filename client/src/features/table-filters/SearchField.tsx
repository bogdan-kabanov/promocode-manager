import { useEffect, useState } from 'react';
import { t } from '@/shared/i18n';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { Input } from '@/shared/ui';

interface SearchFieldProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

/** Поиск уходит на сервер: фильтрация загруженного массива требованию не отвечает. */
export function SearchField({ value, placeholder, onChange }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
  }, [debounced, onChange, value]);

  return (
    <Input
      label={t('filter.search')}
      type="search"
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}
