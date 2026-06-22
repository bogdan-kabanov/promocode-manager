import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletePromoCodeCommand } from './delete-promocode.command';
import {
  PROMOCODE_WRITE_REPOSITORY,
  PromoCodeWriteRepository,
} from '../ports/promocode.write-repository';
import {
  PROMOCODE_SYNC_PORT,
  PromoCodeSyncPort,
} from '../ports/promocode.sync.port';

@CommandHandler(DeletePromoCodeCommand)
export class DeletePromoCodeHandler
  implements ICommandHandler<DeletePromoCodeCommand, void>
{
  constructor(
    @Inject(PROMOCODE_WRITE_REPOSITORY)
    private readonly writeRepo: PromoCodeWriteRepository,
    @Inject(PROMOCODE_SYNC_PORT)
    private readonly sync: PromoCodeSyncPort,
  ) {}

  async execute(command: DeletePromoCodeCommand): Promise<void> {
    const entity = await this.writeRepo.delete(command.id);
    if (!entity) {
      throw new NotFoundException(`Promo code ${command.id} not found`);
    }
    await this.sync.markDeleted(entity);
  }
}
