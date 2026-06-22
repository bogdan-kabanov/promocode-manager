import { PageHeader } from '../ui/PageHeader';
import { PromoCodesTable } from '@/widgets/promocodes-table';

export function PromoCodesPage() {
  return (
    <>
      <PageHeader
        title="Промокоды"
        subtitle="Запись в MongoDB, чтение из ClickHouse"
      />
      <PromoCodesTable />
    </>
  );
}
