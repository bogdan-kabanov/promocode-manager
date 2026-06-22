import { PageHeader } from '../ui/PageHeader';
import { RedemptionsTable } from '@/widgets/redemptions-table';

export function RedemptionsPage() {
  return (
    <>
      <PageHeader
        title="Использования"
        subtitle="Журнал из ClickHouse"
      />
      <RedemptionsTable />
    </>
  );
}
