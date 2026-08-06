import { apiGet, apiPost, apiPut } from '@/shared/api/http';
import type {
  FetchManyResponse,
  SortOrder,
  UpdateUserRequest,
  UserDto,
  UsersFetchManyRequest,
  UsersSortBy,
} from '@/shared/api/types';

export const USERS_SORT_FIELDS: readonly UsersSortBy[] = [
  'name',
  'phone',
  'createdAt',
];

export interface UsersListParams {
  pageIndex: number;
  pageSize: number;
  sortBy: UsersSortBy;
  sortOrder: SortOrder;
  search: string;
  isActive: boolean | null;
}

/** Перечень полей тела закрыт: пустые фильтры в запрос не попадают. */
export function buildUsersRequest(
  params: UsersListParams,
): UsersFetchManyRequest {
  const body: UsersFetchManyRequest = {
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
  if (params.search) body.search = params.search;
  if (params.isActive !== null) body.isActive = params.isActive;
  return body;
}

export const usersApi = {
  fetchMany: (body: UsersFetchManyRequest) =>
    apiPost<FetchManyResponse<UserDto>, UsersFetchManyRequest>(
      '/users/fetch/many',
      body,
    ),
  fetchOne: (mongoId: string) => apiGet<UserDto>(`/users/fetch/one/${mongoId}`),
  update: (mongoId: string, body: UpdateUserRequest) =>
    apiPut<UserDto, UpdateUserRequest>(`/users/update/${mongoId}`, body),
  deactivate: (mongoId: string) =>
    apiPost<UserDto>(`/users/deactivate/${mongoId}`),
  activate: (mongoId: string) => apiPost<UserDto>(`/users/activate/${mongoId}`),
};
