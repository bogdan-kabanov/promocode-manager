import { useMemo, useState } from 'react';
import type { UserDto, UsersSortBy } from '@/shared/api/types';
import {
  USERS_SORT_FIELDS,
  useSetUserActive,
  UserStatusBadge,
  useUsersList,
} from '@/entities/user';
import { useAuth } from '@/features/auth';
import { BooleanFilter, SearchField } from '@/features/table-filters';
import { UserFormModal } from '@/features/user-form';
import { t } from '@/shared/i18n';
import { formatDateTime, formatPhone } from '@/shared/lib/format';
import { readEnum, useUrlQueryState } from '@/shared/lib/useUrlQueryState';
import { URL_KEYS, useTableUrlState } from '@/shared/lib/useTableUrlState';
import {
  Card,
  ConfirmDialog,
  DataTable,
  DataTableColumn,
  PageHeader,
  RowMenu,
  Toolbar,
  ToolbarItem,
} from '@/shared/ui';

const ACTIVE_VALUES = ['true', 'false'] as const;

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const table = useTableUrlState<UsersSortBy>({
    sortFields: USERS_SORT_FIELDS,
    defaultSortBy: 'createdAt',
  });
  const { searchParams, patchUrl } = useUrlQueryState();

  const isActiveParam = readEnum(searchParams, 'active', ACTIVE_VALUES, null);
  const isActive = isActiveParam === null ? null : isActiveParam === 'true';

  const query = useUsersList({
    pageIndex: table.pageIndex,
    pageSize: table.pageSize,
    sortBy: table.sortBy,
    sortOrder: table.sortOrder,
    search: table.search,
    isActive,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingActivation, setPendingActivation] = useState<UserDto | null>(
    null,
  );
  const setActiveMutation = useSetUserActive();

  const columns = useMemo<DataTableColumn<UserDto>[]>(
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
        id: 'createdAt',
        header: t('field.createdAt'),
        meta: { sortField: 'createdAt' },
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <RowMenu
            items={[
              {
                id: 'edit',
                label: t('action.edit'),
                onSelect: () => setEditingId(row.original.mongoId),
              },
              {
                id: 'toggle-active',
                label: t(
                  row.original.isActive
                    ? 'action.deactivate'
                    : 'action.activate',
                ),
                danger: row.original.isActive,
                disabled:
                  row.original.isActive &&
                  row.original.mongoId === currentUser?.mongoId,
                onSelect: () => setPendingActivation(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [currentUser?.mongoId],
  );

  return (
    <>
      <PageHeader
        title={t('page.users.title')}
        subtitle={t('page.users.subtitle')}
      />

      <Card>
        <Toolbar>
          <ToolbarItem grow>
            <SearchField
              value={table.search}
              placeholder={t('filter.search.users')}
              onChange={table.setSearch}
            />
          </ToolbarItem>
          <ToolbarItem>
            <BooleanFilter
              label={t('field.status')}
              value={isActive}
              trueLabel={t('userStatus.active')}
              falseLabel={t('userStatus.inactive')}
              onChange={(next) =>
                patchUrl({
                  active: next === null ? null : String(next),
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
          isSyncing={setActiveMutation.isSyncing}
          getRowId={(row) => row.mongoId}
          onToggleSort={table.toggleSort}
          onPageIndexChange={table.setPageIndex}
          onPageSizeChange={table.setPageSize}
          onRetry={() => void query.refetch()}
        />
      </Card>

      <UserFormModal
        open={editingId !== null}
        mongoId={editingId}
        onClose={() => setEditingId(null)}
      />

      <ConfirmDialog
        open={pendingActivation !== null}
        danger={pendingActivation?.isActive ?? false}
        busy={setActiveMutation.isPending}
        title={t(
          pendingActivation?.isActive
            ? 'confirm.deactivateUser.title'
            : 'confirm.activateUser.title',
        )}
        text={t(
          pendingActivation?.isActive
            ? 'confirm.deactivateUser.text'
            : 'confirm.activateUser.text',
          { name: pendingActivation?.name ?? '' },
        )}
        onCancel={() => setPendingActivation(null)}
        onConfirm={() => {
          if (!pendingActivation) return;
          setActiveMutation.mutate({
            mongoId: pendingActivation.mongoId,
            isActive: !pendingActivation.isActive,
          });
          setPendingActivation(null);
        }}
      />
    </>
  );
}
