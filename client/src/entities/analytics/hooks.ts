import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import {
  analyticsApi,
  AnalyticsPromoCodesParams,
  AnalyticsUsagesParams,
  AnalyticsUsersParams,
  buildAnalyticsPromoCodesRequest,
  buildAnalyticsUsagesRequest,
  buildAnalyticsUsersRequest,
} from './api';

export function useAnalyticsUsers(params: AnalyticsUsersParams, enabled = true) {
  const body = buildAnalyticsUsersRequest(params);
  return useQuery({
    queryKey: queryKeys.analyticsUsersList(body),
    queryFn: () => analyticsApi.users(body),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAnalyticsPromoCodes(
  params: AnalyticsPromoCodesParams,
  enabled = true,
) {
  const body = buildAnalyticsPromoCodesRequest(params);
  return useQuery({
    queryKey: queryKeys.analyticsPromocodesList(body),
    queryFn: () => analyticsApi.promoCodes(body),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAnalyticsUsages(
  params: AnalyticsUsagesParams,
  enabled = true,
) {
  const body = buildAnalyticsUsagesRequest(params);
  return useQuery({
    queryKey: queryKeys.analyticsUsagesList(body),
    queryFn: () => analyticsApi.usages(body),
    placeholderData: keepPreviousData,
    enabled,
  });
}
