import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { useSyncedMutation } from '@/shared/api/useSyncedMutation';
import type { UpdateUserRequest, UserDto } from '@/shared/api/types';
import { buildUsersRequest, usersApi, UsersListParams } from './api';

export function useUsersList(params: UsersListParams) {
  const body = buildUsersRequest(params);
  return useQuery({
    queryKey: queryKeys.usersList(body),
    queryFn: () => usersApi.fetchMany(body),
    placeholderData: keepPreviousData,
  });
}

/** Форму редактирования заполняет документ из MongoDB, а не строка таблицы. */
export function useUserDocument(mongoId: string | null) {
  return useQuery({
    queryKey: queryKeys.user(mongoId ?? ''),
    queryFn: () => usersApi.fetchOne(mongoId as string),
    enabled: mongoId !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

interface UpdateUserVariables {
  mongoId: string;
  body: UpdateUserRequest;
}

export function useUpdateUser(onDone?: () => void) {
  return useSyncedMutation<UserDto, UpdateUserVariables>({
    mutationFn: ({ mongoId, body }) => usersApi.update(mongoId, body),
    syncKeys: [queryKeys.users, queryKeys.analyticsUsers],
    target: (user) => ({ mongoId: user.mongoId, updatedAt: user.updatedAt }),
    successMessage: 'msg.user.updated',
    onDone,
  });
}

export function useSetUserActive() {
  return useSyncedMutation<UserDto, { mongoId: string; isActive: boolean }>({
    mutationFn: ({ mongoId, isActive }) =>
      isActive ? usersApi.activate(mongoId) : usersApi.deactivate(mongoId),
    syncKeys: [queryKeys.users, queryKeys.analyticsUsers],
    target: (user) => ({ mongoId: user.mongoId, updatedAt: user.updatedAt }),
    successMessage: (_user, variables) =>
      variables.isActive ? 'msg.user.activated' : 'msg.user.deactivated',
  });
}
