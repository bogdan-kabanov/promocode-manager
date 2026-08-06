import { useMemo, useState } from 'react';
import {
  PROMOCODE_STATES,
  type PromoCodeRow,
  type PromoCodesSortBy,
  type PromoCodeState,
} from '@/shared/api/types';
import {
  PROMOCODES_SORT_FIELDS,
  PromoCodeStateBadge,
  usePromoCodesList,
  useSetPromoCodeActive,
} from '@/entities/promocode';
import { PromoCodeFormModal } from '@/features/promocode-form';
import { SearchField, StateFilter } from '@/features/table-filters';
import { t } from '@/shared/i18n';
import { formatPercent, formatValidity } from '@/shared/lib/format';
import { readEnum, useUrlQueryState } from '@/shared/lib/useUrlQueryState';
import { URL_KEYS, useTableUrlState } from '@/shared/lib/useTableUrlState';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DataTableColumn,
  PageHeader,
  RowMenu,
  Toolbar,
  ToolbarItem,
} from '@/shared/ui';
import styles from '@/pages/pages.module.css';

type FormTarget = { mongoId: string | null } | null;

export function PromoCodesPage() {
  const table = useTableUrlState<PromoCodesSortBy>({
    sortFields: PROMOCODES_SORT_FIELDS,
    defaultSortBy: 'createdAt',
  });
  const { searchParams, patchUrl } = useUrlQueryState();
  const state = readEnum<PromoCodeState>(
    searchParams,
    'state',
    PROMOCODE_STATES,
    null,
  );

  const query = usePromoCodesList({
    pageIndex: table.pageIndex,
    pageSize: table.pageSize,
    sortBy: table.sortBy,
    sortOrder: table.sortOrder,
    search: table.search,
    state,
  });

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [pendingActivation, setPendingActivation] =
    useState<PromoCodeRow | null>(null);
  const setActiveMutation = useSetPromoCodeActive();

  const columns = useMemo<DataTableColumn<PromoCodeRow>[]>(
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
        meta: { sortField: 'discountPercent', align: 'right' },
        cell: ({ row }) => formatPercent(row.original.discountPercent),
      },
      {
        id: 'state',
        header: t('field.state'),
        cell: ({ row }) => <PromoCodeStateBadge state={row.original.state} />,
      },
      {
        id: 'usedCount',
        header: t('field.usedCount'),
        meta: { sortField: 'usedCount', align: 'right' },
        cell: ({ row }) => row.original.usedCount,
      },
      {
        id: 'validity',
        header: t('field.validity'),
        meta: { sortField: 'validUntil' },
        cell: ({ row }) =>
          formatValidity(row.original.validFrom, row.original.validUntil),
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
                onSelect: () =>
                  setFormTarget({ mongoId: row.original.mongoId }),
              },
              {
                id: 'toggle-active',
                label: t(
                  row.original.isActive
                    ? 'action.deactivate'
                    : 'action.activate',
                ),
                danger: row.original.isActive,
                onSelect: () => setPendingActivation(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title={t('page.promocodes.title')}
        subtitle={t('page.promocodes.subtitle')}
        actions={
          <Button onClick={() => setFormTarget({ mongoId: null })}>
            {t('promocodeForm.create.title')}
          </Button>
        }
      />

      <Card>
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

      <PromoCodeFormModal
        open={formTarget !== null}
        mongoId={formTarget?.mongoId ?? null}
        onClose={() => setFormTarget(null)}
      />

      <ConfirmDialog
        open={pendingActivation !== null}
        danger={pendingActivation?.isActive ?? false}
        busy={setActiveMutation.isPending}
        title={t(
          pendingActivation?.isActive
            ? 'confirm.deactivatePromocode.title'
            : 'confirm.activatePromocode.title',
        )}
        text={t(
          pendingActivation?.isActive
            ? 'confirm.deactivatePromocode.text'
            : 'confirm.activatePromocode.text',
          { code: pendingActivation?.code ?? '' },
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
