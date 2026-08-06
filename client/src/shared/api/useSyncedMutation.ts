import { useCallback, useEffect, useRef, useState } from 'react';
import {
  QueryClient,
  QueryKey,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from '@tanstack/react-query';
import { SYNC_POLL_DELAYS_MS } from '@/shared/config';
import { t, TranslationKey } from '@/shared/i18n';
import { useToast } from '@/shared/ui/Toast/ToastProvider';
import { apiErrorText } from './ApiError';

/** Запись, появления которой в аналитической реплике мы ждём. */
export interface SyncTarget {
  mongoId: string;
  updatedAt?: string | null;
}

interface SyncRow {
  mongoId?: unknown;
  updatedAt?: unknown;
  usedAt?: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function extractRows(data: unknown): SyncRow[] {
  if (typeof data !== 'object' || data === null) return [];
  const rows = (data as { data?: unknown }).data;
  if (!Array.isArray(rows)) return [];
  return rows as SyncRow[];
}

function rowIsFresh(row: SyncRow, target: SyncTarget): boolean {
  if (!target.updatedAt) return true;
  const stamp = typeof row.updatedAt === 'string' ? row.updatedAt : row.usedAt;
  if (typeof stamp !== 'string') return true;
  return new Date(stamp).getTime() >= new Date(target.updatedAt).getTime() - 1;
}

/** Догнала ли реплика: строка есть в загруженных списках и не старее мутации. */
function replicaCaughtUp(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
  target: SyncTarget,
): boolean {
  return keys.some((queryKey) =>
    queryClient
      .getQueriesData({ queryKey })
      .some(([, data]) =>
        extractRows(data).some(
          (row) => row.mongoId === target.mongoId && rowIsFresh(row, target),
        ),
      ),
  );
}

export interface UseSyncedMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Списки из ClickHouse: перечитываются, пока не догонят мутацию. */
  syncKeys?: readonly QueryKey[];
  /** Данные из MongoDB: отставания нет, достаточно одной инвалидации. */
  freshKeys?: readonly QueryKey[];
  /** Запись, по которой видно, что реплика догнала. */
  target?: (data: TData, variables: TVariables) => SyncTarget | null;
  successMessage?:
    | TranslationKey
    | ((data: TData, variables: TVariables) => TranslationKey);
  onDone?: (data: TData, variables: TVariables) => void;
  onFailed?: (error: unknown) => void;
}

/** Результат мутации плюс признак того, что идёт добор данных из реплики. */
export type SyncedMutation<TData, TVariables> = UseMutationResult<
  TData,
  unknown,
  TVariables
> & { isSyncing: boolean };

/**
 * Мутация уходит в MongoDB, а таблицы читаются из ClickHouse с отставанием
 * до двух секунд. Поэтому после успешного ответа список перечитывается по
 * короткому расписанию, пока изменённая запись в нём не появится, — тогда
 * пользователь видит результат своего действия без перезагрузки страницы.
 */
export function useSyncedMutation<TData, TVariables>(
  options: UseSyncedMutationOptions<TData, TVariables>,
): SyncedMutation<TData, TVariables> {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const {
    mutationFn,
    syncKeys,
    freshKeys,
    target,
    successMessage,
    onDone,
    onFailed,
  } = options;

  const refetchUntilSynced = useCallback(
    async (syncTarget: SyncTarget | null, keys: readonly QueryKey[]) => {
      for (const delay of SYNC_POLL_DELAYS_MS) {
        await Promise.all(
          keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
        if (!syncTarget || replicaCaughtUp(queryClient, keys, syncTarget)) {
          return;
        }
        await sleep(delay);
      }
      await Promise.all(
        keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
    [queryClient],
  );

  const mutation = useMutation<TData, unknown, TVariables>({
    mutationFn,
    onSuccess: async (data, variables) => {
      if (successMessage) {
        const key =
          typeof successMessage === 'function'
            ? successMessage(data, variables)
            : successMessage;
        notify(t(key), 'success');
      }
      onDone?.(data, variables);

      if (freshKeys?.length) {
        await Promise.all(
          freshKeys.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
      }

      if (!syncKeys?.length) return;

      setIsSyncing(true);
      try {
        await refetchUntilSynced(target?.(data, variables) ?? null, syncKeys);
      } finally {
        if (mounted.current) setIsSyncing(false);
      }
    },
    onError: (error) => {
      notify(apiErrorText(error), 'error');
      onFailed?.(error);
    },
  });

  return { ...mutation, isSyncing };
}
