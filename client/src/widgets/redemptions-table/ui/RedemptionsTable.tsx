import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Card, DataTable } from '@/shared/ui';
import { useDebounce, formatDateTime, formatMoney } from '@/shared/lib';
import { queryKeys } from '@/shared/api/queryKeys';
import { analyticsApi, Redemption } from '@/entities/analytics';
import styles from './RedemptionsTable.module.css';

export function RedemptionsTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'redeemedAt', desc: true },
  ]);
  const [code, setCode] = useState('');
  const debouncedCode = useDebounce(code);

  const sortField = sorting[0]?.id ?? 'redeemedAt';
  const sortOrder: 'asc' | 'desc' = sorting[0]?.desc === false ? 'asc' : 'desc';

  const query = useQuery({
    queryKey: [
      ...queryKeys.redemptions,
      { page, pageSize, sortField, sortOrder, code: debouncedCode },
    ],
    queryFn: () =>
      analyticsApi.redemptions({
        page,
        pageSize,
        sortField,
        sortOrder,
        code: debouncedCode || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<Redemption, any>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Код',
        cell: ({ row }) => (
          <span style={{ fontWeight: 600 }}>{row.original.code}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Сумма скидки',
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      {
        accessorKey: 'redeemedAt',
        header: 'Дата',
        cell: ({ row }) => formatDateTime(row.original.redeemedAt),
      },
    ],
    [],
  );

  const data = query.data;

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <input
          className={styles.search}
          placeholder="Фильтр по коду…"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable<Redemption>
        columns={columns}
        data={data?.rows ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        sorting={sorting}
        isLoading={query.isLoading}
        onSortingChange={(updater) => {
          setSorting(updater);
          setPage(1);
        }}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </Card>
  );
}
