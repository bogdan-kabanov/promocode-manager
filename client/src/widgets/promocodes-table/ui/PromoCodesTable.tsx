import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { Card, DataTable, Modal, useToast } from '@/shared/ui';
import { useDebounce } from '@/shared/lib';
import { queryKeys } from '@/shared/api/queryKeys';
import { promocodeApi, PromoCode, PromoCodeStatus } from '@/entities/promocode';
import { FilterBar } from '@/features/promocode-filters';
import { PromoCodeForm } from '@/features/promocode-form';
import { buildPromoColumns } from './columns';

export function PromoCodesTable() {
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PromoCodeStatus | ''>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | undefined>(undefined);

  const debouncedSearch = useDebounce(search);

  const sortField = sorting[0]?.id ?? 'createdAt';
  const sortOrder: 'asc' | 'desc' = sorting[0]?.desc === false ? 'asc' : 'desc';

  const query = useQuery({
    queryKey: [
      ...queryKeys.promocodes,
      { page, pageSize, sortField, sortOrder, search: debouncedSearch, status },
    ],
    queryFn: () =>
      promocodeApi.list({
        page,
        pageSize,
        sortField,
        sortOrder,
        search: debouncedSearch || undefined,
        status: status || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo(
    () =>
      buildPromoColumns({
        onEdit: (promocode) => {
          setEditing(promocode);
          setFormOpen(true);
        },
        onNotify: notify,
      }),
    [notify],
  );

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const data = query.data;

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <FilterBar
          search={search}
          status={status}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onStatusChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          onCreate={openCreate}
        />
      </div>

      <DataTable<PromoCode>
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

      <Modal
        open={formOpen}
        title={editing ? 'Редактировать промокод' : 'Новый промокод'}
        onClose={() => setFormOpen(false)}
      >
        <PromoCodeForm
          initial={editing}
          onSuccess={() => {
            setFormOpen(false);
            notify(editing ? 'Промокод обновлён' : 'Промокод создан');
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </Card>
  );
}
