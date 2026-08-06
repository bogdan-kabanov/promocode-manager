import { HttpStatus } from '@nestjs/common';
import { BusinessException, ErrorCode, ErrorCodeValue } from '../../common/errors';
import { LockService } from '../../infrastructure/redis/lock.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { AnalyticsReadRepository } from '../analytics/analytics-read.repository';
import { PromoUsagesRepository } from '../promocodes/promo-usages.repository';
import { PromocodesRepository } from '../promocodes/promocodes.repository';
import { PromoCodeDocument } from '../promocodes/promocode.schema';
import { PromoUsageDocument } from '../promocodes/promo-usage.schema';
import { OrderDocument } from './order.schema';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { UsersRepository } from '../users/users.repository';

const OWNER_ID = '64b7f1c2a1b2c3d4e5f60001';
const OTHER_ID = '64b7f1c2a1b2c3d4e5f60002';
const ORDER_ID = '64b7f1c2a1b2c3d4e5f60010';
const PROMO_ID = '64b7f1c2a1b2c3d4e5f60020';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeOrder(overrides: Partial<OrderDocument> = {}): OrderDocument {
  const now = new Date('2026-08-06T10:00:00.000Z');
  return {
    id: ORDER_ID,
    mongoUserId: OWNER_ID,
    amount: 148305,
    mongoPromocodeId: null,
    promocodeCode: null,
    discountAmount: null,
    finalAmount: 148305,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as unknown as OrderDocument;
}

function makePromocode(overrides: Partial<PromoCodeDocument> = {}): PromoCodeDocument {
  const now = new Date('2026-08-01T10:00:00.000Z');
  return {
    id: PROMO_ID,
    code: 'SALE20',
    discountPercent: 20,
    maxUsagesTotal: null,
    maxUsagesPerUser: null,
    validFrom: null,
    validUntil: null,
    isActive: true,
    usedCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as unknown as PromoCodeDocument;
}

interface Mocks {
  orders: jest.Mocked<OrdersRepository>;
  promocodes: jest.Mocked<PromocodesRepository>;
  usages: jest.Mocked<PromoUsagesRepository>;
  users: jest.Mocked<UsersRepository>;
  locks: jest.Mocked<LockService>;
  outbox: jest.Mocked<OutboxService>;
}

function build(): { service: OrdersService; mocks: Mocks } {
  const orders = {
    findById: jest.fn(),
    applyPromocode: jest.fn(),
  } as unknown as jest.Mocked<OrdersRepository>;

  const promocodes = {
    findByCode: jest.fn(),
    findById: jest.fn(),
    reserveUsage: jest.fn(),
    releaseUsage: jest.fn(),
  } as unknown as jest.Mocked<PromocodesRepository>;

  const usages = {
    countByPromocodeAndUser: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
  } as unknown as jest.Mocked<PromoUsagesRepository>;

  const users = {
    findById: jest.fn().mockResolvedValue({
      id: OWNER_ID,
      name: 'Demo User',
      phone: '+79991234567',
    }),
  } as unknown as jest.Mocked<UsersRepository>;

  const locks = {
    promocodeLockKey: jest.fn((code: string) => `lock:promocode:${code}`),
    acquire: jest.fn().mockResolvedValue({ key: 'lock:promocode:SALE20', token: 'token' }),
    release: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<LockService>;

  const outbox = {
    enqueue: jest.fn().mockResolvedValue(undefined),
    enqueueMany: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<OutboxService>;

  const readModel = { listOrders: jest.fn() } as unknown as AnalyticsReadRepository;

  const service = new OrdersService(
    orders,
    promocodes,
    usages,
    users,
    readModel,
    locks,
    outbox,
  );
  return { service, mocks: { orders, promocodes, usages, users, locks, outbox } };
}

async function expectFailure(
  action: Promise<unknown>,
  code: ErrorCodeValue,
  status: HttpStatus,
): Promise<void> {
  await expect(action).rejects.toBeInstanceOf(BusinessException);
  await action.catch((error: unknown) => {
    const business = error as BusinessException;
    expect(business.code).toBe(code);
    expect(business.getStatus()).toBe(status);
  });
}

describe('OrdersService.applyPromocode — the nine checks, in order', () => {
  it('1. ORDER_NOT_FOUND (404) when the order does not exist', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(null);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.ORDER_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
    expect(mocks.promocodes.findByCode).not.toHaveBeenCalled();
  });

  it('2. ORDER_FORBIDDEN (403) when the order belongs to somebody else', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(makeOrder({ mongoUserId: OTHER_ID }));

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.ORDER_FORBIDDEN,
      HttpStatus.FORBIDDEN,
    );
    expect(mocks.promocodes.findByCode).not.toHaveBeenCalled();
  });

  it('3. ORDER_ALREADY_HAS_PROMOCODE (409) — beats PROMOCODE_NOT_FOUND', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(
      makeOrder({ mongoPromocodeId: PROMO_ID, promocodeCode: 'WELCOME10' }),
    );
    mocks.promocodes.findByCode.mockResolvedValue(null);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'NOSUCHCODE' }, OWNER_ID),
      ErrorCode.ORDER_ALREADY_HAS_PROMOCODE,
      HttpStatus.CONFLICT,
    );
  });

  it('4. PROMOCODE_NOT_FOUND (404) when the code is unknown', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(makeOrder());
    mocks.promocodes.findByCode.mockResolvedValue(null);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'NOSUCHCODE' }, OWNER_ID),
      ErrorCode.PROMOCODE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
    expect(mocks.locks.acquire).not.toHaveBeenCalled();
  });

  it('5. PROMOCODE_DISABLED (409) — beats every later check', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(makeOrder());
    mocks.promocodes.findByCode.mockResolvedValue(
      makePromocode({
        isActive: false,
        validFrom: new Date(Date.now() + DAY_MS),
        validUntil: new Date(Date.now() - DAY_MS),
        maxUsagesTotal: 1,
        usedCount: 1,
      }),
    );

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.PROMOCODE_DISABLED,
      HttpStatus.CONFLICT,
    );
  });

  it('6. PROMOCODE_NOT_STARTED (409) — beats EXPIRED and the limits', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(makeOrder());
    mocks.promocodes.findByCode.mockResolvedValue(
      makePromocode({
        validFrom: new Date(Date.now() + DAY_MS),
        validUntil: new Date(Date.now() - DAY_MS),
        maxUsagesTotal: 1,
        usedCount: 1,
      }),
    );

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.PROMOCODE_NOT_STARTED,
      HttpStatus.CONFLICT,
    );
  });

  it('7. PROMOCODE_EXPIRED (409) — beats the limits', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(makeOrder());
    mocks.promocodes.findByCode.mockResolvedValue(
      makePromocode({
        validUntil: new Date(Date.now() - DAY_MS),
        maxUsagesTotal: 1,
        usedCount: 1,
      }),
    );

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.PROMOCODE_EXPIRED,
      HttpStatus.CONFLICT,
    );
  });

  it('8. PROMOCODE_LIMIT_REACHED (409) — beats USER_LIMIT_REACHED', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(makeOrder());
    mocks.promocodes.findByCode.mockResolvedValue(
      makePromocode({ maxUsagesTotal: 3, usedCount: 3, maxUsagesPerUser: 1 }),
    );
    mocks.usages.countByPromocodeAndUser.mockResolvedValue(1);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.PROMOCODE_LIMIT_REACHED,
      HttpStatus.CONFLICT,
    );
  });

  it('9. USER_LIMIT_REACHED (409) when this user already hit the per-user cap', async () => {
    const { service, mocks } = build();
    mocks.orders.findById.mockResolvedValue(makeOrder());
    mocks.promocodes.findByCode.mockResolvedValue(
      makePromocode({ maxUsagesTotal: 10, usedCount: 2, maxUsagesPerUser: 1 }),
    );
    mocks.usages.countByPromocodeAndUser.mockResolvedValue(1);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.USER_LIMIT_REACHED,
      HttpStatus.CONFLICT,
    );
    expect(mocks.promocodes.reserveUsage).not.toHaveBeenCalled();
  });
});

describe('OrdersService.applyPromocode — locking and persistence', () => {
  function arrangeHappyPath(): { service: OrdersService; mocks: Mocks } {
    const built = build();
    const promocode = makePromocode();
    built.mocks.orders.findById.mockResolvedValue(makeOrder());
    built.mocks.promocodes.findByCode.mockResolvedValue(promocode);
    built.mocks.promocodes.findById.mockResolvedValue(promocode);
    built.mocks.promocodes.reserveUsage.mockResolvedValue(makePromocode({ usedCount: 1 }));
    built.mocks.orders.applyPromocode.mockResolvedValue(
      makeOrder({
        mongoPromocodeId: PROMO_ID,
        promocodeCode: 'SALE20',
        discountAmount: 29661,
        finalAmount: 118644,
      }),
    );
    built.mocks.usages.create.mockResolvedValue({
      id: '64b7f1c2a1b2c3d4e5f60030',
      mongoPromocodeId: PROMO_ID,
      promocodeCode: 'SALE20',
      mongoUserId: OWNER_ID,
      mongoOrderId: ORDER_ID,
      orderAmount: 148305,
      discountAmount: 29661,
      usedAt: new Date(),
    } as unknown as PromoUsageDocument);
    return built;
  }

  it('applies the discount and always releases the lock', async () => {
    const { service, mocks } = arrangeHappyPath();

    const result = await service.applyPromocode(ORDER_ID, { code: ' sale20 ' }, OWNER_ID);

    expect(mocks.locks.acquire).toHaveBeenCalledWith('lock:promocode:SALE20');
    expect(mocks.promocodes.findByCode).toHaveBeenCalledWith('SALE20');
    expect(mocks.promocodes.reserveUsage).toHaveBeenCalledWith(PROMO_ID);
    expect(mocks.locks.release).toHaveBeenCalledTimes(1);
    expect(mocks.outbox.enqueueMany).toHaveBeenCalledTimes(1);

    expect(result.amount).toBe(1483.05);
    expect(result.discountAmount).toBe(296.61);
    expect(result.finalAmount).toBe(1186.44);
    expect(result.promocodeCode).toBe('SALE20');
  });

  it('fails with PROMOCODE_LOCK_TIMEOUT when the lock cannot be taken', async () => {
    const { service, mocks } = arrangeHappyPath();
    mocks.locks.acquire.mockResolvedValue(null);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.PROMOCODE_LOCK_TIMEOUT,
      HttpStatus.CONFLICT,
    );
    expect(mocks.locks.release).not.toHaveBeenCalled();
  });

  it('reports PROMOCODE_LIMIT_REACHED when the atomic reservation loses the race', async () => {
    const { service, mocks } = arrangeHappyPath();
    mocks.promocodes.reserveUsage.mockResolvedValue(null);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.PROMOCODE_LIMIT_REACHED,
      HttpStatus.CONFLICT,
    );
    expect(mocks.locks.release).toHaveBeenCalledTimes(1);
  });

  it('gives the reserved slot back when the order was taken meanwhile', async () => {
    const { service, mocks } = arrangeHappyPath();
    mocks.orders.applyPromocode.mockResolvedValue(null);

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.ORDER_ALREADY_HAS_PROMOCODE,
      HttpStatus.CONFLICT,
    );
    expect(mocks.promocodes.releaseUsage).toHaveBeenCalledWith(PROMO_ID);
    expect(mocks.locks.release).toHaveBeenCalledTimes(1);
  });

  it('re-checks the promo code inside the lock', async () => {
    const { service, mocks } = arrangeHappyPath();
    mocks.promocodes.findById.mockResolvedValue(makePromocode({ isActive: false }));

    await expectFailure(
      service.applyPromocode(ORDER_ID, { code: 'SALE20' }, OWNER_ID),
      ErrorCode.PROMOCODE_DISABLED,
      HttpStatus.CONFLICT,
    );
    expect(mocks.promocodes.reserveUsage).not.toHaveBeenCalled();
    expect(mocks.locks.release).toHaveBeenCalledTimes(1);
  });
});
