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
      amount: this.discountAmount(entity),
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

  private discountAmount(entity: PromoCodeEntity): number {
    return entity.discountType === DiscountType.PERCENTAGE
      ? Math.round((entity.discountValue / 100) * 1000 * 100) / 100
      : entity.discountValue;
  }
}
