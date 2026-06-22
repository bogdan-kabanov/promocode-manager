import { useQuery } from '@tanstack/react-query';
import { Badge, Card } from '@/shared/ui';
import { formatMoney, formatNumber } from '@/shared/lib';
import { queryKeys } from '@/shared/api/queryKeys';
import { analyticsApi } from '@/entities/analytics';
import { STATUS_LABELS, PromoCodeStatus } from '@/entities/promocode';
import styles from './AnalyticsOverview.module.css';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'neutral'> = {
  ACTIVE: 'green',
  PAUSED: 'amber',
  EXPIRED: 'red',
};

export function AnalyticsOverview() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.analyticsSummary,
    queryFn: () => analyticsApi.summary(),
    refetchInterval: 15000,
  });

  const stats = [
    { label: 'Всего промокодов', value: formatNumber(data?.totalPromocodes ?? 0) },
    { label: 'Активных', value: formatNumber(data?.activePromocodes ?? 0) },
    { label: 'Всего использований', value: formatNumber(data?.totalRedemptions ?? 0) },
    { label: 'Сумма скидок', value: formatMoney(data?.totalDiscountGiven ?? 0) },
  ];

  const byDay = data?.redemptionsByDay ?? [];
  const maxCount = Math.max(1, ...byDay.map((d) => d.count));

  return (
    <div>
      <div className={styles.grid}>
        {stats.map((s) => (
          <Card key={s.label} className={styles.stat}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statValue}>{isLoading ? '—' : s.value}</div>
          </Card>
        ))}
      </div>

      <div className={styles.columns}>
        <Card className={styles.panel}>
          <div className={styles.panelTitle}>Использования (30 дней)</div>
          {byDay.length === 0 ? (
            <div className={styles.empty}>Нет данных</div>
          ) : (
            <div className={styles.chart}>
              {byDay.map((d) => (
                <div key={d.day} className={styles.barWrap} title={`${d.day}: ${d.count}`}>
                  <div
                    className={styles.bar}
                    style={{ height: `${(d.count / maxCount) * 100}%` }}
                  />
                  <span className={styles.barLabel}>{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div>
          <Card className={styles.panel} style={{ marginBottom: 14 }}>
            <div className={styles.panelTitle}>По статусам</div>
            {(data?.byStatus ?? []).length === 0 ? (
              <div className={styles.empty}>Нет данных</div>
            ) : (
              data?.byStatus.map((s) => (
                <div key={s.status} className={styles.statusRow}>
                  <Badge tone={STATUS_TONE[s.status] ?? 'neutral'}>
                    {STATUS_LABELS[s.status as PromoCodeStatus] ?? s.status}
                  </Badge>
                  <span className={styles.listMeta}>{formatNumber(s.count)}</span>
                </div>
              ))
            )}
          </Card>

          <Card className={styles.panel}>
            <div className={styles.panelTitle}>Топ промокодов</div>
            {(data?.topPromocodes ?? []).length === 0 ? (
              <div className={styles.empty}>Нет данных</div>
            ) : (
              <div className={styles.list}>
                {data?.topPromocodes.map((p) => (
                  <div key={p.code} className={styles.listRow}>
                    <span className={styles.listCode}>{p.code}</span>
                    <span className={styles.listMeta}>
                      {formatNumber(p.redemptions)} исп.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
