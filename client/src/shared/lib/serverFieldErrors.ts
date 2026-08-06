import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';

/**
 * Ошибки полей из ответа 400 показываются рядом со своими полями.
 * Текст приходит от сервера, поэтому текстом интерфейса не является.
 */
export function applyServerFieldErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fields: readonly Path<TValues>[],
): void {
  toApiError(error).fieldErrors.forEach(({ field, message }) => {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<TValues>, { type: 'server', message });
    }
  });
}
