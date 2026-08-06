import { useMemo, useState } from 'react';
import type { OrderDto, OrdersSortBy } from '@/shared/api/types';
import { ORDERS_SORT_FIELDS, useOrdersList } from '@/entities/order';
import { ApplyPromoCodeModal } from '@/features/apply-promocode';
import { CreateOrderModal } from '@/features/order-form';
import { BooleanFilter } from '@/features/table-filters';
import { t } from '@/shared/i18n';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { readEnum, useUrlQueryState } from '@/shared/lib/useUrlQueryState';
import { URL_KEYS, useTableUrlState } from '@/shared/lib/useTableUrlState';
import {
  Button,
  Card,
  DataTable,
  DataTableColumn,
  PageHeader,
  RowMenu,
  Toolbar,
  ToolbarItem,
} from '@/shared/ui';
import styles from '@/pages/pages.module.css';

const PROMO_VALUES = ['true', 'false'] as const;

export function OrdersPage() {
  const table = useTableUrlState<OrdersSortBy>({
    sortFields: ORDERS_SORT_FIELDS,
    defaultSortBy: 'createdAt',
  });
  const { searchParams, patchUrl } = useUrlQueryState();

  const promoParam = readEnum(searchParams, 'promo', PROMO_VALUES, null);
  const hasPromocode = promoParam === null ? null : promoParam === 'true';

  const query = useOrdersList({
    pageIndex: table.pageIndex,
    pageSize: table.pageSize,
    sortBy: table.sortBy,
    sortOrder: table.sortOrder,
    hasPromocode,
  });

  const [creating, setCreating] = useState(false);
  const [applyTarget, setApplyTarget] = useState<OrderDto | null>(null);

  const columns = useMemo<DataTableColumn<OrderDto>[]>(
    () => [
      {
        id: 'createdAt',
        header: t('field.createdAt'),
        meta: { sortField: 'createdAt' },
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'amount',
        header: t('field.amount'),
        meta: { sortField: 'amount', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      {
        id: 'promocodeCode',
        header: t('field.promocode'),
        cell: ({ row }) =>
          row.original.promocodeCode ? (
            <span className={styles.code}>{row.original.promocodeCode}</span>
          ) : (
            t('value.empty')
          ),
      },
      {
        id: 'discountAmount',
        header: t('field.discountAmount'),
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.discountAmount === null
            ? t('value.empty')
            : formatMoney(row.original.discountAmount),
      },
      {
        id: 'finalAmount',
        header: t('field.finalAmount'),
        meta: { sortField: 'finalAmount', align: 'right' },
        cell: ({ row }) => formatMoney(row.original.finalAmount),
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.promocodeCode === null ? (
            <RowMenu
              items={[
                {
                  id: 'apply',
                  label: t('action.apply'),
                  onSelect: () => setApplyTarget(row.original),
                },
              ]}
            />
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title={t('page.orders.title')}
        subtitle={t('page.orders.subtitle')}
        actions={
          <Button onClick={() => setCreating(true)}>
            {t('orderForm.create.title')}
          </Button>
        }
      />

      <Card>
        <Toolbar>
          <ToolbarItem>
            <BooleanFilter
              label={t('filter.hasPromocode')}
              value={hasPromocode}
              trueLabel={t('filter.hasPromocode.yes')}
              falseLabel={t('filter.hasPromocode.no')}
              onChange={(next) =>
                patchUrl({
                  promo: next === null ? null : String(next),
                  [URL_KEYS.page]: null,
                })
              }
            />
          </ToolbarItem>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={query.data?.data ?? []}
          totalCount={query.data?.totalCount ?? 0}
          pageIndex={table.pageIndex}
          pageSize={table.pageSize}
          sortBy={table.sortBy}
          sortOrder={table.sortOrder}
          status={query.status}
          error={query.error}
          isFetching={query.isFetching}
          getRowId={(row) => row.mongoId}
          onToggleSort={table.toggleSort}
          onPageIndexChange={table.setPageIndex}
          onPageSizeChange={table.setPageSize}
          onRetry={() => void query.refetch()}
        />
      </Card>

      <CreateOrderModal open={creating} onClose={() => setCreating(false)} />
      <ApplyPromoCodeModal
        order={applyTarget}
        onClose={() => setApplyTarget(null)}
      />
    </>
  );
}
