import { http, Paginated } from '@/shared/api';
import { PromoCode, PromoCodeInput, PromoCodeStatus } from '../model/types';

export interface ListPromoCodesParams {
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  status?: PromoCodeStatus;
}

export const promocodeApi = {
  /** Query side — served from ClickHouse. */
  async list(params: ListPromoCodesParams): Promise<Paginated<PromoCode>> {
    const { data } = await http.get<Paginated<PromoCode>>('/promocodes', {
      params,
    });
    return data;
  },

  /** Command side — persisted in MongoDB, replicated to ClickHouse. */
  async create(input: PromoCodeInput): Promise<PromoCode> {
    const { data } = await http.post<PromoCode>('/promocodes', input);
    return data;
  },

  async update(id: string, input: Partial<PromoCodeInput>): Promise<PromoCode> {
    const { data } = await http.patch<PromoCode>(`/promocodes/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/promocodes/${id}`);
  },

  async redeem(id: string): Promise<PromoCode> {
    const { data } = await http.post<PromoCode>(`/promocodes/${id}/redeem`);
    return data;
  },
};
