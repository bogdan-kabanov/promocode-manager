import { Injectable } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../../common/errors';
import { ListResult, toPagination } from '../../common/dto/list-request.dto';
import {
  calculateDiscountKopecks,
  finalAmountKopecks,
  toKopecks,
} from '../../common/money';
import { LockService } from '../../infrastructure/redis/lock.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { OUTBOX_ENTITY } from '../../infrastructure/outbox/outbox.types';
import { AnalyticsReadRepository } from '../analytics/analytics-read.repository';
import { PromoCodeDocument } from '../promocodes/promocode.schema';
import { PromocodesRepository } from '../promocodes/promocodes.repository';
import { PromoUsagesRepository } from '../promocodes/promo-usages.repository';
import { toPromocodeSnapshot } from '../promocodes/promocode.mapper';
import { normalizePromocode } from '../promocodes/promocodes.service';
import { UsersRepository } from '../users/users.repository';
import { OrderDocument } from './order.schema';
import {
  OrderResponse,
  readRowToOrderResponse,
  toOrderResponse,
  toOrderSnapshot,
} from './order.mapper';
import { OrdersRepository } from './orders.repository';
import { ApplyPromocodeDto, CreateOrderDto, FetchOrdersDto } from './dto/orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly promocodes: PromocodesRepository,
    private readonly usages: PromoUsagesRepository,
    private readonly users: UsersRepository,
    private readonly readModel: AnalyticsReadRepository,
    private readonly locks: LockService,
    private readonly outbox: OutboxService,
  ) {}

  /** Always scoped to the authenticated user. */
  async fetchMany(dto: FetchOrdersDto, currentUserId: string): Promise<ListResult<OrderResponse>> {
    const { limit, offset } = toPagination(dto);
    const result = await this.readModel.listOrders({
      limit,
      offset,
      sortOrder: dto.sortOrder,
      sortBy: dto.sortBy,
      mongoUserId: currentUserId,
      hasPromocode: dto.hasPromocode ?? null,
    });
    return { data: result.data.map(readRowToOrderResponse), totalCount: result.totalCount };
  }

  async fetchOne(mongoId: string, currentUserId: string): Promise<OrderResponse> {
    const order = await this.orders.findById(mongoId);
    if (!order) throw BusinessException.notFound(ErrorCode.ORDER_NOT_FOUND);
    if (order.mongoUserId !== currentUserId) {
      throw BusinessException.forbidden(ErrorCode.ORDER_FORBIDDEN);
    }
    return toOrderResponse(order);
  }

  async create(dto: CreateOrderDto, currentUserId: string): Promise<OrderResponse> {
    const amount = toKopecks(dto.amount);
    const created = await this.orders.create({
      mongoUserId: currentUserId,
      amount,
      finalAmount: amount,
    });
    await this.publishOrder(created);
    return toOrderResponse(created);
  }

  /**
   * The nine checks, evaluated strictly in this order; the first failure wins:
   *   1 ORDER_NOT_FOUND 404              6 PROMOCODE_NOT_STARTED 409
   *   2 ORDER_FORBIDDEN 403              7 PROMOCODE_EXPIRED 409
   *   3 ORDER_ALREADY_HAS_PROMOCODE 409  8 PROMOCODE_LIMIT_REACHED 409
   *   4 PROMOCODE_NOT_FOUND 404          9 USER_LIMIT_REACHED 409
   *   5 PROMOCODE_DISABLED 409
   *
   * Checks 5-9 run twice: once optimistically, then again while holding the
   * Redis lock `lock:promocode:{CODE}`, where the total limit is additionally
   * enforced by an atomic conditional `$inc` in MongoDB.
   */
  async applyPromocode(
    orderId: string,
    dto: ApplyPromocodeDto,
    currentUserId: string,
  ): Promise<OrderResponse> {
    const code = normalizePromocode(dto.code);

    const order = await this.orders.findById(orderId);
    if (!order) throw BusinessException.notFound(ErrorCode.ORDER_NOT_FOUND); // 1
    if (order.mongoUserId !== currentUserId) {
      throw BusinessException.forbidden(ErrorCode.ORDER_FORBIDDEN); // 2
    }
    if (order.mongoPromocodeId !== null) {
      throw BusinessException.conflict(ErrorCode.ORDER_ALREADY_HAS_PROMOCODE); // 3
    }

    const promocode = await this.promocodes.findByCode(code);
    if (!promocode) throw BusinessException.notFound(ErrorCode.PROMOCODE_NOT_FOUND); // 4

    await this.assertUsable(promocode, currentUserId); // 5-9

    const lock = await this.locks.acquire(this.locks.promocodeLockKey(code));
    if (!lock) throw BusinessException.conflict(ErrorCode.PROMOCODE_LOCK_TIMEOUT);

    try {
      const fresh = await this.promocodes.findById(promocode.id as string);
      if (!fresh) throw BusinessException.notFound(ErrorCode.PROMOCODE_NOT_FOUND);
      await this.assertUsable(fresh, currentUserId);

      // Atomic reservation: `$inc` applies only while usedCount < maxUsagesTotal.
      const reserved = await this.promocodes.reserveUsage(fresh.id as string);
      if (!reserved) throw BusinessException.conflict(ErrorCode.PROMOCODE_LIMIT_REACHED);

      const discountAmount = calculateDiscountKopecks(order.amount, reserved.discountPercent);
      const finalAmount = finalAmountKopecks(order.amount, discountAmount);

      const updatedOrder = await this.orders.applyPromocode(orderId, {
        mongoPromocodeId: reserved.id as string,
        promocodeCode: reserved.code,
        discountAmount,
        finalAmount,
      });
      if (!updatedOrder) {
        await this.promocodes.releaseUsage(reserved.id as string);
        throw BusinessException.conflict(ErrorCode.ORDER_ALREADY_HAS_PROMOCODE);
      }

      const user = await this.users.findById(currentUserId);
      if (!user) throw BusinessException.notFound(ErrorCode.USER_NOT_FOUND);

      const usage = await this.usages.create({
        mongoPromocodeId: reserved.id as string,
        promocodeCode: reserved.code,
        mongoUserId: currentUserId,
        mongoOrderId: orderId,
        orderAmount: order.amount,
        discountAmount,
      });

      // Mongo succeeded — now hand everything to the outbox for ClickHouse.
      await this.outbox.enqueueMany([
        {
          entityType: OUTBOX_ENTITY.promocode,
          entityId: reserved.id as string,
          payload: toPromocodeSnapshot(reserved),
        },
        {
          entityType: OUTBOX_ENTITY.order,
          entityId: updatedOrder.id as string,
          payload: toOrderSnapshot(updatedOrder, user),
        },
        {
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
        },
      ]);

      return toOrderResponse(updatedOrder);
    } finally {
      await this.locks.release(lock);
    }
  }

  /** Checks 5 through 9 against a promo code document. */
  private async assertUsable(promocode: PromoCodeDocument, userId: string): Promise<void> {
    const now = Date.now();

    if (!promocode.isActive) {
      throw BusinessException.conflict(ErrorCode.PROMOCODE_DISABLED); // 5
    }
    if (promocode.validFrom !== null && now < promocode.validFrom.getTime()) {
      throw BusinessException.conflict(ErrorCode.PROMOCODE_NOT_STARTED); // 6
    }
    if (promocode.validUntil !== null && now >= promocode.validUntil.getTime()) {
      throw BusinessException.conflict(ErrorCode.PROMOCODE_EXPIRED); // 7
    }
    if (
      promocode.maxUsagesTotal !== null &&
      promocode.usedCount >= promocode.maxUsagesTotal
    ) {
      throw BusinessException.conflict(ErrorCode.PROMOCODE_LIMIT_REACHED); // 8
    }
    if (promocode.maxUsagesPerUser !== null) {
      const used = await this.usages.countByPromocodeAndUser(promocode.id as string, userId);
      if (used >= promocode.maxUsagesPerUser) {
        throw BusinessException.conflict(ErrorCode.USER_LIMIT_REACHED); // 9
      }
    }
  }

  private async publishOrder(order: OrderDocument): Promise<void> {
    const user = await this.users.findById(order.mongoUserId);
    if (!user) throw BusinessException.notFound(ErrorCode.USER_NOT_FOUND);
    await this.outbox.enqueue({
      entityType: OUTBOX_ENTITY.order,
      entityId: order.id as string,
      payload: toOrderSnapshot(order, user),
    });
  }
}
