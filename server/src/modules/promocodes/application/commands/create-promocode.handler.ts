import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePromoCodeCommand } from './create-promocode.command';
import {
  PROMOCODE_WRITE_REPOSITORY,
  PromoCodeEntity,
  PromoCodeWriteRepository,
} from '../ports/promocode.write-repository';
import {
  PROMOCODE_SYNC_PORT,
  PromoCodeSyncPort,
} from '../ports/promocode.sync.port';

@CommandHandler(CreatePromoCodeCommand)
export class CreatePromoCodeHandler
  implements ICommandHandler<CreatePromoCodeCommand, PromoCodeEntity>
{
  constructor(
    @Inject(PROMOCODE_WRITE_REPOSITORY)
    private readonly writeRepo: PromoCodeWriteRepository,
    @Inject(PROMOCODE_SYNC_PORT)
    private readonly sync: PromoCodeSyncPort,
  ) {}

  async execute(command: CreatePromoCodeCommand): Promise<PromoCodeEntity> {
    try {
      const entity = await this.writeRepo.create({
        code: command.code,
        description: command.description,
        discountType: command.discountType,
        discountValue: command.discountValue,
        maxUsages: command.maxUsages,
        status: command.status,
        startsAt: command.startsAt,
        expiresAt: command.expiresAt,
      });
      await this.sync.upsert(entity);
      return entity;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException(`Promo code "${command.code}" already exists`);
      }
      throw err;
    }
  }
}
