import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { RedeemPromoCodeCommand } from './redeem-promocode.command';
import {
  PROMOCODE_WRITE_REPOSITORY,
  PromoCodeEntity,
  PromoCodeWriteRepository,
} from '../ports/promocode.write-repository';
import {
  PROMOCODE_SYNC_PORT,
  PromoCodeSyncPort,
} from '../ports/promocode.sync.port';
import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

@CommandHandler(RedeemPromoCodeCommand)
export class RedeemPromoCodeHandler
  implements ICommandHandler<RedeemPromoCodeCommand, PromoCodeEntity>
{
  constructor(
    @Inject(PROMOCODE_WRITE_REPOSITORY)
    private readonly writeRepo: PromoCodeWriteRepository,
    @Inject(PROMOCODE_SYNC_PORT)
    private readonly sync: PromoCodeSyncPort,
  ) {}

  async execute(command: RedeemPromoCodeCommand): Promise<PromoCodeEntity> {
    const current = await this.writeRepo.findById(command.id);
    if (!current) {
      throw new NotFoundException(`Promo code ${command.id} not found`);
    }
    this.assertRedeemable(current);

    const entity = await this.writeRepo.incrementUsage(command.id);
    if (!entity) {
      throw new NotFoundException(`Promo code ${command.id} not found`);
    }

    await this.sync.upsert(entity);
    await this.sync.recordRedemption({
      id: randomUUID(),
      promocodeId: entity.id,
      code: entity.code,
      amount: this.discountAmount(entity, command.orderAmount),
      redeemedAt: new Date(),
    });

    return entity;
  }

  private assertRedeemable(entity: PromoCodeEntity): void {
    if (entity.status !== PromoCodeStatus.ACTIVE) {
      throw new BadRequestException('Promo code is not active');
    }
    const now = Date.now();
    if (entity.startsAt && new Date(entity.startsAt).getTime() > now) {
      throw new BadRequestException('Promo code is not active yet');
    }
    if (entity.expiresAt && new Date(entity.expiresAt).getTime() < now) {
      throw new BadRequestException('Promo code has expired');
    }
    if (entity.maxUsages > 0 && entity.usedCount >= entity.maxUsages) {
      throw new BadRequestException('Promo code usage limit reached');
    }
  }

  /**
   * Computes the actual discount applied for this redemption.
   * - FIXED: the discount value, capped by the order amount when provided.
   * - PERCENTAGE: a share of the order amount; 0 when no order amount is known,
   *   since a percentage discount is meaningless without a base.
   */
  private discountAmount(entity: PromoCodeEntity, orderAmount?: number): number {
    if (entity.discountType === DiscountType.PERCENTAGE) {
      if (orderAmount == null) return 0;
      return this.round2((orderAmount * entity.discountValue) / 100);
    }

    return orderAmount == null
      ? entity.discountValue
      : Math.min(entity.discountValue, orderAmount);
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
