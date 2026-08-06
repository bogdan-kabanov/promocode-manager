import { useMemo } from 'react';
import type {
  AnalyticsUsageRow,
  AnalyticsUsagesSortBy,
} from '@/shared/api/types';
import {
  ANALYTICS_USAGES_SORT_FIELDS,
  useAnalyticsUsages,
} from '@/entities/analytics';
import { DateRangeFilter } from '@/features/date-range-filter';
import { SearchField } from '@/features/table-filters';
import { t } from '@/shared/i18n';
import { formatDateTime, formatMoney, formatPhone } from '@/shared/lib/format';
import { useDateRangeUrlState } from '@/shared/lib/useDateRangeUrlState';
import { useTableUrlState } from '@/shared/lib/useTableUrlState';
import {
  Card,
  DataTable,
  DataTableColumn,
  PageHeader,
  Toolbar,
  ToolbarItem,
} from '@/shared/ui';
import styles from '@/pages/pages.module.css';

export function AnalyticsUsagesPage() {
  const table = useTableUrlState<AnalyticsUsagesSortBy>({
    sortFields: ANALYTICS_USAGES_SORT_FIELDS,
    defaultSortBy: 'usedAt',
  });
  const dateRange = useDateRangeUrlState();

  const query = useAnalyticsUsages(
    {
      pageIndex: table.pageIndex,
      pageSize: table.pageSize,
      sortBy: table.sortBy,
      sortOrder: table.sortOrder,
      search: table.search,
      bounds: dateRange.bounds,
    },
    dateRange.isValid,
  );

  const columns = useMemo<DataTableColumn<AnalyticsUsageRow>[]>(
    () => [
      {
        id: 'promocodeCode',
        header: t('field.promocode'),
        meta: { sortField: 'promocodeCode' },
        cell: ({ row }) => (
          <span className={styles.code}>{row.original.promocodeCode}</span>
        ),
      },
      {
        id: 'user',
        header: t('field.user'),
        cell: ({ row }) => (
          <span className={styles.stacked}>
            <span>{row.original.userName}</span>
            <span className={styles.stackedSecondary}>
              {formatPhone(row.original.userPhone)}
            </span>
          </span>
        ),
      },
      {
        id: 'order',
        header: t('field.order'),
        meta: { mono: true },
        cell: ({ row }) => row.original.mongoOrderId,
      },
      {
        id: 'orderAmount',
        header: t('field.amount'),
        meta: { sortField: 'orderAmount', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.orderAmount),
      },
      {
        id: 'discountAmount',
        header: t('field.discountAmount'),
        meta: { sortField: 'discountAmount', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.discountAmount),
      },
      {
        id: 'usedAt',
        header: t('field.usedAt'),
        meta: { sortField: 'usedAt' },
        cell: ({ row }) => formatDateTime(row.original.usedAt),
      },
    ],
    [],
  );

  const rows = dateRange.isValid ? (query.data?.data ?? []) : [];
  const totalCount = dateRange.isValid ? (query.data?.totalCount ?? 0) : 0;

  return (
    <>
      <PageHeader
        title={t('page.analytics.usages.title')}
        subtitle={t('page.analytics.usages.subtitle')}
      />

      <Card>
        <DateRangeFilter state={dateRange} />
        <Toolbar>
          <ToolbarItem grow>
            <SearchField
              value={table.search}
              placeholder={t('filter.search.usages')}
              onChange={table.setSearch}
            />
          </ToolbarItem>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={rows}
          totalCount={totalCount}
          pageIndex={table.pageIndex}
          pageSize={table.pageSize}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          status={dateRange.isValid ? query.status : 'success'}
          error={query.error}
          isFetching={dateRange.isValid && query.isFetching}
          emptyHint={dateRange.isValid ? undefined : t('dateFilter.invalid')}
          getRowId={(row) => row.mongoId}
          onToggleSort={table.toggleSort}
          onPageIndexChange={table.setPageIndex}
          onPageSizeChange={table.setPageSize}
          onRetry={() => void query.refetch()}
        />
      </Card>
    </>
  );
}
