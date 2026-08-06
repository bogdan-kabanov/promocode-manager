import { useMemo } from 'react';
import {
  PROMOCODE_STATES,
  type AnalyticsPromoCodeRow,
  type AnalyticsPromoCodesSortBy,
  type PromoCodeState,
} from '@/shared/api/types';
import {
  ANALYTICS_PROMOCODES_SORT_FIELDS,
  useAnalyticsPromoCodes,
} from '@/entities/analytics';
import { PromoCodeStateBadge } from '@/entities/promocode';
import { DateRangeFilter } from '@/features/date-range-filter';
import { SearchField, StateFilter } from '@/features/table-filters';
import { t } from '@/shared/i18n';
import { formatMoney, formatPercent, formatValidity } from '@/shared/lib/format';
import { useDateRangeUrlState } from '@/shared/lib/useDateRangeUrlState';
import { URL_KEYS, useTableUrlState } from '@/shared/lib/useTableUrlState';
import { readEnum, useUrlQueryState } from '@/shared/lib/useUrlQueryState';
import {
  Card,
  DataTable,
  DataTableColumn,
  PageHeader,
  Toolbar,
  ToolbarItem,
} from '@/shared/ui';
import styles from '@/pages/pages.module.css';

export function AnalyticsPromoCodesPage() {
  const table = useTableUrlState<AnalyticsPromoCodesSortBy>({
    sortFields: ANALYTICS_PROMOCODES_SORT_FIELDS,
    defaultSortBy: 'usageCount',
  });
  const dateRange = useDateRangeUrlState();
  const { searchParams, patchUrl } = useUrlQueryState();
  const state = readEnum<PromoCodeState>(
    searchParams,
    'state',
    PROMOCODE_STATES,
    null,
  );

  const query = useAnalyticsPromoCodes(
    {
      pageIndex: table.pageIndex,
      pageSize: table.pageSize,
      sortBy: table.sortBy,
      sortOrder: table.sortOrder,
      search: table.search,
      state,
      bounds: dateRange.bounds,
    },
    dateRange.isValid,
  );

  const columns = useMemo<DataTableColumn<AnalyticsPromoCodeRow>[]>(
    () => [
      {
        id: 'code',
        header: t('field.code'),
        meta: { sortField: 'code' },
        cell: ({ row }) => (
          <span className={styles.code}>{row.original.code}</span>
        ),
      },
      {
        id: 'discountPercent',
        header: t('field.discountPercent'),
        meta: { align: 'right' },
        cell: ({ row }) => formatPercent(row.original.discountPercent),
      },
      {
        id: 'state',
        header: t('field.state'),
        cell: ({ row }) => <PromoCodeStateBadge state={row.original.state} />,
      },
      {
        id: 'usageCount',
        header: t('field.usageCount'),
        meta: { sortField: 'usageCount', align: 'right' },
        cell: ({ row }) => row.original.usageCount,
      },
      {
        id: 'uniqueUsers',
        header: t('field.uniqueUsers'),
        meta: { sortField: 'uniqueUsers', align: 'right' },
        cell: ({ row }) => row.original.uniqueUsers,
      },
      {
        id: 'grossRevenue',
        header: t('field.grossRevenue'),
        meta: { sortField: 'grossRevenue', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.grossRevenue),
      },
      {
        id: 'totalDiscount',
        header: t('field.totalDiscountIssued'),
        meta: { sortField: 'totalDiscount', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.totalDiscount),
      },
      {
        id: 'validity',
        header: t('field.validity'),
        cell: ({ row }) =>
          formatValidity(row.original.validFrom, row.original.validUntil),
      },
    ],
    [],
  );

  const rows = dateRange.isValid ? (query.data?.data ?? []) : [];
  const totalCount = dateRange.isValid ? (query.data?.totalCount ?? 0) : 0;

  return (
    <>
      <PageHeader
        title={t('page.analytics.promocodes.title')}
        subtitle={t('page.analytics.promocodes.subtitle')}
      />

      <Card>
        <DateRangeFilter state={dateRange} />
        <Toolbar>
          <ToolbarItem grow>
            <SearchField
              value={table.search}
              placeholder={t('filter.search.promocodes')}
              onChange={table.setSearch}
            />
          </ToolbarItem>
          <ToolbarItem>
            <StateFilter
              value={state}
              onChange={(next) =>
                patchUrl({ state: next, [URL_KEYS.page]: null })
              }
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
