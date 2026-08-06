import { useCallback } from 'react';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/shared/config';
import type { SortOrder } from '@/shared/api';
import { readEnum, readInt, useUrlQueryState } from './useUrlQueryState';

const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'];

export const URL_KEYS = {
  page: 'page',
  pageSize: 'size',
  sortBy: 'sort',
  sortOrder: 'dir',
  search: 'q',
} as const;

export interface TableUrlState<TSortBy extends string> {
  pageIndex: number;
  pageSize: number;
  sortBy: TSortBy;
  sortOrder: SortOrder;
  search: string;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  toggleSort: (field: string) => void;
}

interface Options<TSortBy extends string> {
  sortFields: readonly TSortBy[];
  defaultSortBy: TSortBy;
  defaultSortOrder?: SortOrder;
}

/**
 * Пагинация, сортировка и поиск таблицы. Значения проверяются при чтении из
 * адреса: в запрос к хранилищу произвольная строка из URL не попадёт.
 */
export function useTableUrlState<TSortBy extends string>({
  sortFields,
  defaultSortBy,
  defaultSortOrder = 'desc',
}: Options<TSortBy>): TableUrlState<TSortBy> {
  const { searchParams, patchUrl } = useUrlQueryState();

  const pageIndex = readInt(searchParams, URL_KEYS.page, 1, 1, 1_000_000) - 1;
  const pageSize = readInt(
    searchParams,
    URL_KEYS.pageSize,
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );
  const sortBy =
    readEnum(searchParams, URL_KEYS.sortBy, sortFields, defaultSortBy) ??
    defaultSortBy;
  const sortOrder =
    readEnum(searchParams, URL_KEYS.sortOrder, SORT_ORDERS, defaultSortOrder) ??
    defaultSortOrder;
  const search = searchParams.get(URL_KEYS.search) ?? '';

  const setPageIndex = useCallback(
    (next: number) => {
      patchUrl({ [URL_KEYS.page]: next <= 0 ? null : String(next + 1) });
    },
    [patchUrl],
  );

  const setPageSize = useCallback(
    (next: number) => {
      patchUrl({
        [URL_KEYS.pageSize]: next === DEFAULT_PAGE_SIZE ? null : String(next),
        [URL_KEYS.page]: null,
      });
    },
    [patchUrl],
  );

  const setSearch = useCallback(
    (next: string) => {
      patchUrl({
        [URL_KEYS.search]: next.trim() || null,
        [URL_KEYS.page]: null,
      });
    },
    [patchUrl],
  );

  const toggleSort = useCallback(
    (field: string) => {
      if (!(sortFields as readonly string[]).includes(field)) return;
      const nextOrder: SortOrder =
        field === sortBy ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
      patchUrl({
        [URL_KEYS.sortBy]: field === defaultSortBy ? null : field,
        [URL_KEYS.sortOrder]: nextOrder === defaultSortOrder ? null : nextOrder,
        [URL_KEYS.page]: null,
      });
    },
    [defaultSortBy, defaultSortOrder, patchUrl, sortBy, sortFields, sortOrder],
  );

  return {
    pageIndex,
    pageSize,
    sortBy,
    sortOrder,
    search,
    setPageIndex,
    setPageSize,
    setSearch,
    toggleSort,
  };
}
