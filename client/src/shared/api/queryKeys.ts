/**
 * Ключи кэша запросов. Корень сущности используется и для инвалидации,
 * и для проверки того, догнала ли реплика в ClickHouse свежую мутацию.
 */
export const queryKeys = {
  users: ['users'] as const,
  usersList: (params: unknown) => ['users', 'list', params] as const,
  user: (mongoId: string) => ['users', 'one', mongoId] as const,

  promocodes: ['promocodes'] as const,
  promocodesList: (params: unknown) => ['promocodes', 'list', params] as const,
  promocode: (mongoId: string) => ['promocodes', 'one', mongoId] as const,

  orders: ['orders'] as const,
  ordersList: (params: unknown) => ['orders', 'list', params] as const,
  order: (mongoId: string) => ['orders', 'one', mongoId] as const,

  analyticsUsers: ['analytics', 'users'] as const,
  analyticsUsersList: (params: unknown) =>
    ['analytics', 'users', 'list', params] as const,

  analyticsPromocodes: ['analytics', 'promocodes'] as const,
  analyticsPromocodesList: (params: unknown) =>
    ['analytics', 'promocodes', 'list', params] as const,

  analyticsUsages: ['analytics', 'usages'] as const,
  analyticsUsagesList: (params: unknown) =>
    ['analytics', 'usages', 'list', params] as const,
} as const;
