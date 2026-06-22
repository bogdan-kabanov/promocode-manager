import { NotFoundException } from '@nestjs/common';
import { DeletePromoCodeHandler } from './delete-promocode.handler';
import { DeletePromoCodeCommand } from './delete-promocode.command';
import { PromoCodeWriteRepository } from '../ports/promocode.write-repository';
import { PromoCodeSyncPort } from '../ports/promocode.sync.port';
import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

describe('DeletePromoCodeHandler', () => {
  let handler: DeletePromoCodeHandler;
  let writeRepo: jest.Mocked<PromoCodeWriteRepository>;
  let syncPort: jest.Mocked<PromoCodeSyncPort>;

  const mockEntity = {
    id: 'abc123',
    code: 'TOREMOVE',
    description: '',
    discountType: DiscountType.FIXED,
    discountValue: 100,
    maxUsages: 10,
    usedCount: 0,
    status: PromoCodeStatus.ACTIVE,
    startsAt: new Date(),
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(() => {
    writeRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(mockEntity),
      incrementUsage: jest.fn(),
      findById: jest.fn(),
    };
    syncPort = {
      upsert: jest.fn(),
      markDeleted: jest.fn().mockResolvedValue(undefined),
      recordRedemption: jest.fn(),
    };
    handler = new DeletePromoCodeHandler(writeRepo, syncPort);
  });

  it('should delete from MongoDB and mark deleted in ClickHouse', async () => {
    const command = new DeletePromoCodeCommand('abc123');

    await handler.execute(command);

    expect(writeRepo.delete).toHaveBeenCalledWith('abc123');
    expect(syncPort.markDeleted).toHaveBeenCalledWith(mockEntity);
  });

  it('should throw NotFoundException if not found', async () => {
    writeRepo.delete.mockResolvedValue(null);

    const command = new DeletePromoCodeCommand('nonexistent');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(syncPort.markDeleted).not.toHaveBeenCalled();
  });
});
