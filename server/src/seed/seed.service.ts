import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { APP_CONFIG, AppConfig } from '../config/configuration';
import { calculateDiscountKopecks, finalAmountKopecks } from '../common/money';
import { normalizePhone, phoneToDigits } from '../common/phone';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { OUTBOX_ENTITY, OutboxEnqueueInput } from '../infrastructure/outbox/outbox.types';
import { OutboxWorker } from '../infrastructure/sync/outbox.worker';
import { OrdersRepository } from '../modules/orders/orders.repository';
import { toOrderSnapshot } from '../modules/orders/order.mapper';
import { PromoUsagesRepository } from '../modules/promocodes/promo-usages.repository';
import { PromocodesRepository } from '../modules/promocodes/promocodes.repository';
import { toPromocodeSnapshot } from '../modules/promocodes/promocode.mapper';
import { UsersRepository } from '../modules/users/users.repository';
import { toUserSnapshot } from '../modules/users/user.mapper';
import { UserDocument } from '../modules/users/user.schema';
import { PromoCodeDocument } from '../modules/promocodes/promocode.schema';
import {
  SEED_MIN_USAGES,
  SEED_ORDERS_COUNT,
  SEED_PROMOCODES,
  SEED_USERS,
  SeedPromocodeDefinition,
} from './seed.data';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic PRNG so every run produces the same demo dataset. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PlannedOrder {
  userIndex: number;
  amountKopecks: number;
  createdAt: Date;
  promocodeIndex: number | null;
}

/**
 * Idempotent demo seed. It runs on every start and does nothing when the
 * database already contains users.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly promocodes: PromocodesRepository,
    private readonly orders: OrdersRepository,
    private readonly usages: PromoUsagesRepository,
    private readonly outbox: OutboxService,
    private readonly worker: OutboxWorker,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.seed.enabled) return;
    try {
      await this.run();
    } catch (error) {
      this.logger.error(`Seeding failed: ${(error as Error).message}`);
    }
  }

  private async run(): Promise<void> {
    if ((await this.users.count()) > 0) {
      this.logger.log('Seed skipped: the database already contains users');
      return;
    }

    const now = Date.now();
    const random = createRandom(20260806);

    const userDocs = await this.seedUsers(now);
    const plan = this.planOrders(random, userDocs.length, now);
    const promoDocs = await this.seedPromocodes(now, plan);
    const events = await this.seedOrdersAndUsages(plan, userDocs, promoDocs);

    await this.outbox.enqueueMany(events);
    await this.worker.drain();

    const usageCount = plan.filter((item) => item.promocodeIndex !== null).length;
    this.logger.log(
      `Seeded ${userDocs.length} users, ${promoDocs.length} promocodes, ` +
        `${plan.length} orders, ${usageCount} usages`,
    );
  }

  private async seedUsers(now: number): Promise<UserDocument[]> {
    const passwordHash = await bcrypt.hash(this.config.seed.demoPassword, this.config.bcryptRounds);

    const inputs = SEED_USERS.map((definition) => {
      const phone = normalizePhone(definition.phone);
      if (!phone) {
        throw new Error(`Seed phone ${definition.phone} is not a valid RU mobile number`);
      }
      const createdAt = new Date(now - definition.createdDaysAgo * DAY_MS);
      return {
        phone,
        phoneDigits: phoneToDigits(phone),
        name: definition.name,
        passwordHash,
        isActive: definition.isActive,
        createdAt,
        updatedAt: createdAt,
      };
    });

    return this.users.createManyWithTimestamps(inputs);
  }

  private async seedPromocodes(
    now: number,
    plan: PlannedOrder[],
  ): Promise<PromoCodeDocument[]> {
    const usedCounts = new Map<number, number>();
    for (const order of plan) {
      if (order.promocodeIndex === null) continue;
      usedCounts.set(order.promocodeIndex, (usedCounts.get(order.promocodeIndex) ?? 0) + 1);
    }

    const inputs = SEED_PROMOCODES.map((definition, index) => {
      const createdAt = new Date(now - 60 * DAY_MS);
      return {
        code: definition.code,
        discountPercent: definition.discountPercent,
        maxUsagesTotal: definition.maxUsagesTotal,
        maxUsagesPerUser: definition.maxUsagesPerUser,
        validFrom: this.offsetDays(now, definition.validFromDays),
        validUntil: this.offsetDays(now, definition.validUntilDays),
        isActive: definition.isActive,
        usedCount: usedCounts.get(index) ?? 0,
        createdAt,
        updatedAt: createdAt,
      };
    });

    return this.promocodes.createManyWithTimestamps(inputs);
  }

  private offsetDays(now: number, days: number | null): Date | null {
    return days === null ? null : new Date(now + days * DAY_MS);
  }

  /**
   * Builds the order plan up front so promo `usedCount` values are consistent
   * with the usages that will be written, and so every per-code and per-user
   * limit is respected.
   */
  private planOrders(random: () => number, userCount: number, now: number): PlannedOrder[] {
    const usableIndexes = SEED_PROMOCODES.map((definition, index) => ({ definition, index }))
      .filter((entry) => entry.definition.usableInSeed)
      .map((entry) => entry.index);

    const totalUsed = new Map<number, number>();
    const perUserUsed = new Map<string, number>();
    const plan: PlannedOrder[] = [];
    let usagesPlanned = 0;

    for (let index = 0; index < SEED_ORDERS_COUNT; index += 1) {
      const userIndex = Math.floor(random() * userCount);
      // Always in the past: the intra-day offset is subtracted, never added.
      const createdAt = new Date(
        now - this.pickDaysAgo(random) * DAY_MS - Math.floor(random() * DAY_MS),
      );
      // 50.00 … 25 000.00 RUB, kopeck precision.
      const amountKopecks = 5000 + Math.floor(random() * 2_495_000);

      let promocodeIndex: number | null = null;
      const wantsPromocode = usagesPlanned < SEED_MIN_USAGES || random() < 0.3;
      if (wantsPromocode) {
        promocodeIndex = this.pickPromocode(
          random,
          usableIndexes,
          userIndex,
          totalUsed,
          perUserUsed,
        );
        if (promocodeIndex !== null) usagesPlanned += 1;
      }

      plan.push({ userIndex, amountKopecks, createdAt: createdAt, promocodeIndex });
    }

    return plan;
  }

  /** Spreads activity over today, the last 7 days and the last 30 days. */
  private pickDaysAgo(random: () => number): number {
    const bucket = random();
    if (bucket < 0.2) return 0;
    if (bucket < 0.55) return Math.floor(random() * 7);
    return Math.floor(random() * 30);
  }

  private pickPromocode(
    random: () => number,
    usableIndexes: number[],
    userIndex: number,
    totalUsed: Map<number, number>,
    perUserUsed: Map<string, number>,
  ): number | null {
    const start = Math.floor(random() * usableIndexes.length);
    for (let step = 0; step < usableIndexes.length; step += 1) {
      const index = usableIndexes[(start + step) % usableIndexes.length] as number;
      const definition = SEED_PROMOCODES[index] as SeedPromocodeDefinition;
      const total = totalUsed.get(index) ?? 0;
      const perUserKey = `${index}:${userIndex}`;
      const perUser = perUserUsed.get(perUserKey) ?? 0;

      if (definition.maxUsagesTotal !== null && total >= definition.maxUsagesTotal) continue;
      if (definition.maxUsagesPerUser !== null && perUser >= definition.maxUsagesPerUser) continue;

      totalUsed.set(index, total + 1);
      perUserUsed.set(perUserKey, perUser + 1);
      return index;
    }
    return null;
  }

  private async seedOrdersAndUsages(
    plan: PlannedOrder[],
    userDocs: UserDocument[],
    promoDocs: PromoCodeDocument[],
  ): Promise<OutboxEnqueueInput[]> {
    const orderInputs = plan.map((item) => {
      const user = userDocs[item.userIndex] as UserDocument;
      const promocode =
        item.promocodeIndex === null ? null : (promoDocs[item.promocodeIndex] as PromoCodeDocument);
      const discountAmount =
        promocode === null
          ? null
          : calculateDiscountKopecks(item.amountKopecks, promocode.discountPercent);

      return {
        mongoUserId: user.id as string,
        amount: item.amountKopecks,
        mongoPromocodeId: promocode === null ? null : (promocode.id as string),
        promocodeCode: promocode === null ? null : promocode.code,
        discountAmount,
        finalAmount:
          discountAmount === null
            ? item.amountKopecks
            : finalAmountKopecks(item.amountKopecks, discountAmount),
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      };
    });

    const orderDocs = await this.orders.createManyWithTimestamps(orderInputs);

    const usageInputs = plan.flatMap((item, index) => {
      if (item.promocodeIndex === null) return [];
      const order = orderDocs[index];
      const promocode = promoDocs[item.promocodeIndex];
      if (!order || !promocode || order.discountAmount === null) return [];
      return [
        {
          mongoPromocodeId: promocode.id as string,
          promocodeCode: promocode.code,
          mongoUserId: order.mongoUserId,
          mongoOrderId: order.id as string,
          orderAmount: order.amount,
          discountAmount: order.discountAmount,
          usedAt: item.createdAt,
        },
      ];
    });

    const usageDocs = await this.usages.createMany(usageInputs);

    return [
      ...userDocs.map((user) => ({
        entityType: OUTBOX_ENTITY.user,
        entityId: user.id as string,
        payload: toUserSnapshot(user),
      })),
      ...promoDocs.map((promocode) => ({
        entityType: OUTBOX_ENTITY.promocode,
        entityId: promocode.id as string,
        payload: toPromocodeSnapshot(promocode),
      })),
      ...orderDocs.map((order) => {
        const user = userDocs.find((item) => (item.id as string) === order.mongoUserId);
        if (!user) {
          throw new Error(`Seed order ${order.id as string} references a missing user`);
        }
        return {
          entityType: OUTBOX_ENTITY.order,
          entityId: order.id as string,
          payload: toOrderSnapshot(order, user),
        };
      }),
      ...usageDocs.map((usage) => {
        const user = userDocs.find((item) => (item.id as string) === usage.mongoUserId);
        if (!user) {
          throw new Error(`Seed usage ${usage.id as string} references a missing user`);
        }
        return {
          entityType: OUTBOX_ENTITY.promoUsage,
          entityId: usage.id as string,
          payload: {
            mongoId: usage.id as string,
            mongoPromocodeId: usage.mongoPromocodeId,
            promocodeCode: usage.promocodeCode,
            mongoUserId: usage.mongoUserId,
            userName: user.name,
            userPhone: user.phone,
            mongoOrderId: usage.mongoOrderId,
            orderAmount: usage.orderAmount,
            discountAmount: usage.discountAmount,
            usedAt: usage.usedAt,
          },
        };
      }),
    ];
  }
}
