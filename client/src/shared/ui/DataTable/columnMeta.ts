import type { RowData } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Имя поля сортировки в контракте API. Пусто — колонка не сортируется. */
    sortField?: string;
    align?: 'right' | 'center';
    /** Технические значения (идентификаторы) не переносятся по словам. */
    mono?: boolean;
  }
}

export type { RowData };
