import { http, Paginated } from '@/shared/api';
import { AnalyticsSummary, Redemption } from '../model/types';

export interface ListRedemptionsParams {
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  code?: string;
}

export const analyticsApi = {
  async summary(): Promise<AnalyticsSummary> {
    const { data } = await http.get<AnalyticsSummary>('/analytics/summary');
    return data;
  },

  async redemptions(
    params: ListRedemptionsParams,
  ): Promise<Paginated<Redemption>> {
    const { data } = await http.get<Paginated<Redemption>>(
      '/analytics/redemptions',
      { params },
    );
    return data;
  },
};
