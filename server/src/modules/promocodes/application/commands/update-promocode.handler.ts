import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePromoCodeCommand } from './update-promocode.command';
import {
  PROMOCODE_WRITE_REPOSITORY,
  PromoCodeEntity,
  PromoCodeWriteRepository,
} from '../ports/promocode.write-repository';
import {
  PROMOCODE_SYNC_PORT,
  PromoCodeSyncPort,
} from '../ports/promocode.sync.port';

@CommandHandler(UpdatePromoCodeCommand)
export class UpdatePromoCodeHandler
  implements ICommandHandler<UpdatePromoCodeCommand, PromoCodeEntity>
{
  constructor(
    @Inject(PROMOCODE_WRITE_REPOSITORY)
    private readonly writeRepo: PromoCodeWriteRepository,
    @Inject(PROMOCODE_SYNC_PORT)
    private readonly sync: PromoCodeSyncPort,
  ) {}

  async execute(command: UpdatePromoCodeCommand): Promise<PromoCodeEntity> {
    const entity = await this.writeRepo.update(command.id, command.data);
    if (!entity) {
      throw new NotFoundException(`Promo code ${command.id} not found`);
    }
    await this.sync.upsert(entity);
    return entity;
  }
}
