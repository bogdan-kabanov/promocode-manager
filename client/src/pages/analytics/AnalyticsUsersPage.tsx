import { useMemo } from 'react';
import type { AnalyticsUserRow, AnalyticsUsersSortBy } from '@/shared/api/types';
import {
  ANALYTICS_USERS_SORT_FIELDS,
  useAnalyticsUsers,
} from '@/entities/analytics';
import { UserStatusBadge } from '@/entities/user';
import { DateRangeFilter } from '@/features/date-range-filter';
import { SearchField } from '@/features/table-filters';
import { t } from '@/shared/i18n';
import { formatMoney, formatPhone } from '@/shared/lib/format';
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

export function AnalyticsUsersPage() {
  const table = useTableUrlState<AnalyticsUsersSortBy>({
    sortFields: ANALYTICS_USERS_SORT_FIELDS,
    defaultSortBy: 'totalSpent',
  });
  const dateRange = useDateRangeUrlState();

  const query = useAnalyticsUsers(
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

  const columns = useMemo<DataTableColumn<AnalyticsUserRow>[]>(
    () => [
      {
        id: 'name',
        header: t('field.name'),
        meta: { sortField: 'name' },
        cell: ({ row }) => row.original.name,
      },
      {
        id: 'phone',
        header: t('field.phone'),
        meta: { sortField: 'phone' },
        cell: ({ row }) => formatPhone(row.original.phone),
      },
      {
        id: 'status',
        header: t('field.status'),
        cell: ({ row }) => <UserStatusBadge isActive={row.original.isActive} />,
      },
      {
        id: 'ordersCount',
        header: t('field.ordersCount'),
        meta: { sortField: 'ordersCount', align: 'right' },
        cell: ({ row }) => row.original.ordersCount,
      },
      {
        id: 'totalSpent',
        header: t('field.totalSpent'),
        meta: { sortField: 'totalSpent', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.totalSpent),
      },
      {
        id: 'totalDiscount',
        header: t('field.totalDiscountReceived'),
        meta: { sortField: 'totalDiscount', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.totalDiscount),
      },
      {
        id: 'promocodesUsed',
        header: t('field.promocodesUsed'),
        meta: { sortField: 'promocodesUsed', align: 'right' },
        cell: ({ row }) => row.original.promocodesUsed,
      },
    ],
    [],
  );

  // Некорректный диапазон на сервер не уходит: показываем пустую выдачу с пояснением.
  const rows = dateRange.isValid ? (query.data?.data ?? []) : [];
  const totalCount = dateRange.isValid ? (query.data?.totalCount ?? 0) : 0;

  return (
    <>
      <PageHeader
        title={t('page.analytics.users.title')}
        subtitle={t('page.analytics.users.subtitle')}
      />

      <Card>
        <DateRangeFilter state={dateRange} />
        <Toolbar>
          <ToolbarItem grow>
            <SearchField
              value={table.search}
              placeholder={t('filter.search.users')}
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
