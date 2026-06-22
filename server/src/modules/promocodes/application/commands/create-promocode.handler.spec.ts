import { ConflictException } from '@nestjs/common';
import { CreatePromoCodeHandler } from './create-promocode.handler';
import { CreatePromoCodeCommand } from './create-promocode.command';
import { PromoCodeWriteRepository } from '../ports/promocode.write-repository';
import { PromoCodeSyncPort } from '../ports/promocode.sync.port';
import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

describe('CreatePromoCodeHandler', () => {
  let handler: CreatePromoCodeHandler;
  let writeRepo: jest.Mocked<PromoCodeWriteRepository>;
  let syncPort: jest.Mocked<PromoCodeSyncPort>;

  const mockEntity = {
    id: 'abc123',
    code: 'SUMMER25',
    description: 'Summer sale',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 25,
    maxUsages: 100,
    usedCount: 0,
    status: PromoCodeStatus.ACTIVE,
    startsAt: new Date('2026-06-01'),
    expiresAt: new Date('2026-09-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(() => {
    writeRepo = {
      create: jest.fn().mockResolvedValue(mockEntity),
      update: jest.fn(),
      delete: jest.fn(),
      incrementUsage: jest.fn(),
      findById: jest.fn(),
    };
    syncPort = {
      upsert: jest.fn().mockResolvedValue(undefined),
      markDeleted: jest.fn(),
      recordRedemption: jest.fn(),
    };
    handler = new CreatePromoCodeHandler(writeRepo, syncPort);
  });

  it('should create a promocode and sync to ClickHouse', async () => {
    const command = new CreatePromoCodeCommand(
      'SUMMER25',
      'Summer sale',
      DiscountType.PERCENTAGE,
      25,
      100,
      PromoCodeStatus.ACTIVE,
      new Date('2026-06-01'),
      new Date('2026-09-01'),
    );

    const result = await handler.execute(command);

    expect(result).toEqual(mockEntity);
    expect(writeRepo.create).toHaveBeenCalledWith({
      code: 'SUMMER25',
      description: 'Summer sale',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 25,
      maxUsages: 100,
      status: PromoCodeStatus.ACTIVE,
      startsAt: new Date('2026-06-01'),
      expiresAt: new Date('2026-09-01'),
    });
    expect(syncPort.upsert).toHaveBeenCalledWith(mockEntity);
  });

  it('should throw ConflictException on duplicate code', async () => {
    writeRepo.create.mockRejectedValue({ code: 11000 });

    const command = new CreatePromoCodeCommand(
      'SUMMER25',
      '',
      DiscountType.PERCENTAGE,
      25,
      100,
      PromoCodeStatus.ACTIVE,
      new Date(),
      null,
    );

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });
});
