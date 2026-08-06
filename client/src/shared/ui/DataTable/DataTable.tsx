import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { apiErrorText } from '@/shared/api/ApiError';
import { PAGE_SIZE_OPTIONS } from '@/shared/config';
import { t } from '@/shared/i18n';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import './columnMeta';
import styles from './DataTable.module.css';

export type DataTableColumn<TRow> = ColumnDef<TRow, unknown>;

export type DataStatus = 'pending' | 'error' | 'success';

interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  status: DataStatus;
  error: unknown;
  isFetching: boolean;
  isSyncing?: boolean;
  emptyHint?: string;
  getRowId: (row: TRow) => string;
  onToggleSort: (field: string) => void;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
}

/**
 * Таблица с четырьмя различимыми состояниями: загрузка, ошибка, пусто, данные.
 * Пагинация, сортировка и фильтрация выполняются запросом к серверу, поэтому
 * компонент только показывает текущую страницу и сообщает о намерениях наружу.
 */
export function DataTable<TRow>({
  columns,
  rows,
  totalCount,
  pageIndex,
  pageSize,
  sortBy,
  sortOrder,
  status,
  error,
  isFetching,
  isSyncing = false,
  emptyHint,
  getRowId,
  onToggleSort,
  onPageIndexChange,
  onPageSizeChange,
  onRetry,
}: DataTableProps<TRow>) {
  const table = useReactTable({
    data: rows,
    columns,
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  if (status === 'error') {
    return (
      <div className={styles.state} role="alert">
        <div className={styles.stateIconError}>!</div>
        <div className={styles.stateTitle}>{t('state.error.title')}</div>
        <div className={styles.stateText}>{apiErrorText(error)}</div>
        <Button onClick={onRetry}>{t('action.retry')}</Button>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className={styles.state}>
        <Spinner />
        <div className={styles.stateText}>{t('state.loading')}</div>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <div className={styles.wrapper}>
      {(isFetching || isSyncing) && (
        <div className={styles.activity}>
          <span className={styles.activityBar} />
          {isSyncing && (
            <span className={styles.activityText}>{t('state.syncing')}</span>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className={styles.state}>
          <div className={styles.stateIconEmpty}>∅</div>
          <div className={styles.stateTitle}>{t('state.empty')}</div>
          <div className={styles.stateText}>
            {emptyHint ?? t('state.empty.hint')}
          </div>
        </div>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const sortField = meta?.sortField;
                    const isSorted = sortField !== undefined && sortField === sortBy;
                    const classes = [
                      sortField ? styles.sortable : '',
                      meta?.align === 'right' ? styles.alignRight : '',
                      meta?.align === 'center' ? styles.alignCenter : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <th
                        key={header.id}
                        className={classes}
                        aria-sort={
                          isSorted
                            ? sortOrder === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                        onClick={
                          sortField ? () => onToggleSort(sortField) : undefined
                        }
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {isSorted && (
                          <span
                            className={styles.sortIcon}
                            title={t(
                              sortOrder === 'asc'
                                ? 'table.sort.asc'
                                : 'table.sort.desc',
                            )}
                          >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    const classes = [
                      meta?.align === 'right' ? styles.alignRight : '',
                      meta?.align === 'center' ? styles.alignCenter : '',
                      meta?.mono ? styles.mono : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <td key={cell.id} className={classes}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.info}>
          {rows.length === 0
            ? t('table.total', { total: totalCount })
            : t('table.range', { from, to, total: totalCount })}
        </span>

        <div className={styles.pager}>
          <label className={styles.pageSizeLabel}>
            {t('table.pageSize')}
            <select
              className={styles.pageSize}
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="secondary"
            size="sm"
            disabled={pageIndex <= 0}
            onClick={() => onPageIndexChange(pageIndex - 1)}
          >
            {t('table.prev')}
          </Button>
          <span className={styles.info}>
            {t('table.page', { page: pageIndex + 1, pages: pageCount })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={pageIndex + 1 >= pageCount}
            onClick={() => onPageIndexChange(pageIndex + 1)}
          >
            {t('table.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
