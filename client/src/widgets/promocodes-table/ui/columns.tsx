import { ColumnDef } from '@tanstack/react-table';
import {
  DiscountLabel,
  PromoCode,
  StatusBadge,
} from '@/entities/promocode';
import { RowActions } from '@/features/promocode-actions';
import { formatDate } from '@/shared/lib';

interface BuildColumnsArgs {
  onEdit: (promocode: PromoCode) => void;
  onNotify: (message: string, tone?: 'success' | 'error') => void;
}

export function buildPromoColumns({
  onEdit,
  onNotify,
}: BuildColumnsArgs): ColumnDef<PromoCode, any>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Код',
      cell: ({ row }) => (
        <span style={{ fontWeight: 600 }}>{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'discountValue',
      header: 'Скидка',
      cell: ({ row }) => (
        <DiscountLabel
          type={row.original.discountType}
          value={row.original.discountValue}
        />
      ),
    },
    {
      accessorKey: 'usedCount',
      header: 'Исп.',
      enableSorting: true,
      cell: ({ row }) => {
        const { usedCount, maxUsages } = row.original;
        return (
          <span>
            {usedCount}
            {maxUsages > 0 ? ` / ${maxUsages}` : ' / ∞'}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Статус',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'startsAt',
      header: 'Начало',
      cell: ({ row }) => formatDate(row.original.startsAt),
    },
    {
      accessorKey: 'expiresAt',
      header: 'Истекает',
      cell: ({ row }) => formatDate(row.original.expiresAt),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <RowActions
          promocode={row.original}
          onEdit={onEdit}
          onNotify={onNotify}
        />
      ),
    },
  ];
}
