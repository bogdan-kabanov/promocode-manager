import { PageHeader } from '../ui/PageHeader';
import { AnalyticsOverview } from '@/widgets/analytics-overview';

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Дэшборд"
        subtitle="Аналитика в реальном времени из ClickHouse"
      />
      <AnalyticsOverview />
    </>
  );
}
