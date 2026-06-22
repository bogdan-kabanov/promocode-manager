import { NotFoundException } from '@nestjs/common';
import { UpdatePromoCodeHandler } from './update-promocode.handler';
import { UpdatePromoCodeCommand } from './update-promocode.command';
import { PromoCodeWriteRepository } from '../ports/promocode.write-repository';
import { PromoCodeSyncPort } from '../ports/promocode.sync.port';
import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

describe('UpdatePromoCodeHandler', () => {
  let handler: UpdatePromoCodeHandler;
  let writeRepo: jest.Mocked<PromoCodeWriteRepository>;
  let syncPort: jest.Mocked<PromoCodeSyncPort>;

  const mockEntity = {
    id: 'abc123',
    code: 'SUMMER25',
    description: 'Updated description',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 30,
    maxUsages: 100,
    usedCount: 0,
    status: PromoCodeStatus.ACTIVE,
    startsAt: new Date(),
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 2,
  };

  beforeEach(() => {
    writeRepo = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(mockEntity),
      delete: jest.fn(),
      incrementUsage: jest.fn(),
      findById: jest.fn(),
    };
    syncPort = {
      upsert: jest.fn().mockResolvedValue(undefined),
      markDeleted: jest.fn(),
      recordRedemption: jest.fn(),
    };
    handler = new UpdatePromoCodeHandler(writeRepo, syncPort);
  });

  it('should update and sync', async () => {
    const command = new UpdatePromoCodeCommand('abc123', {
      description: 'Updated description',
      discountValue: 30,
    });

    const result = await handler.execute(command);

    expect(result).toEqual(mockEntity);
    expect(writeRepo.update).toHaveBeenCalledWith('abc123', {
      description: 'Updated description',
      discountValue: 30,
    });
    expect(syncPort.upsert).toHaveBeenCalledWith(mockEntity);
  });

  it('should throw NotFoundException if not found', async () => {
    writeRepo.update.mockResolvedValue(null);

    const command = new UpdatePromoCodeCommand('nonexistent', {
      discountValue: 50,
    });

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(syncPort.upsert).not.toHaveBeenCalled();
  });
});
