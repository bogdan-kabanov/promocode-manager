import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RedeemPromoCodeHandler } from './redeem-promocode.handler';
import { RedeemPromoCodeCommand } from './redeem-promocode.command';
import { PromoCodeWriteRepository } from '../ports/promocode.write-repository';
import { PromoCodeSyncPort } from '../ports/promocode.sync.port';
import { DiscountType, PromoCodeStatus } from '../../domain/promocode.types';

describe('RedeemPromoCodeHandler', () => {
  let handler: RedeemPromoCodeHandler;
  let writeRepo: jest.Mocked<PromoCodeWriteRepository>;
  let syncPort: jest.Mocked<PromoCodeSyncPort>;

  const baseEntity = {
    id: 'abc123',
    code: 'ACTIVE10',
    description: '',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    maxUsages: 5,
    usedCount: 0,
    status: PromoCodeStatus.ACTIVE,
    startsAt: new Date('2020-01-01'),
    expiresAt: new Date('2030-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  beforeEach(() => {
    writeRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      incrementUsage: jest.fn().mockResolvedValue({ ...baseEntity, usedCount: 1, version: 2 }),
      findById: jest.fn().mockResolvedValue(baseEntity),
    };
    syncPort = {
      upsert: jest.fn().mockResolvedValue(undefined),
      markDeleted: jest.fn(),
      recordRedemption: jest.fn().mockResolvedValue(undefined),
    };
    handler = new RedeemPromoCodeHandler(writeRepo, syncPort);
  });

  it('should redeem, increment usage, sync, and record redemption', async () => {
    const command = new RedeemPromoCodeCommand('abc123');
    const result = await handler.execute(command);

    expect(result.usedCount).toBe(1);
    expect(writeRepo.findById).toHaveBeenCalledWith('abc123');
    expect(writeRepo.incrementUsage).toHaveBeenCalledWith('abc123');
    expect(syncPort.upsert).toHaveBeenCalled();
    expect(syncPort.recordRedemption).toHaveBeenCalledWith(
      expect.objectContaining({
        promocodeId: 'abc123',
        code: 'ACTIVE10',
        amount: expect.any(Number),
      }),
    );
  });

  it('should throw NotFoundException if promo code not found', async () => {
    writeRepo.findById.mockResolvedValue(null);

    await expect(handler.execute(new RedeemPromoCodeCommand('bad'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if promo code is paused', async () => {
    writeRepo.findById.mockResolvedValue({
      ...baseEntity,
      status: PromoCodeStatus.PAUSED,
    });

    await expect(handler.execute(new RedeemPromoCodeCommand('abc123'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if usage limit reached', async () => {
    writeRepo.findById.mockResolvedValue({
      ...baseEntity,
      usedCount: 5,
      maxUsages: 5,
    });

    await expect(handler.execute(new RedeemPromoCodeCommand('abc123'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if expired', async () => {
    writeRepo.findById.mockResolvedValue({
      ...baseEntity,
      expiresAt: new Date('2020-01-01'),
    });

    await expect(handler.execute(new RedeemPromoCodeCommand('abc123'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should compute a percentage discount from the order amount', async () => {
    await handler.execute(new RedeemPromoCodeCommand('abc123', 250));

    expect(syncPort.recordRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 25 }),
    );
  });

  it('should record 0 for a percentage discount without an order amount', async () => {
    await handler.execute(new RedeemPromoCodeCommand('abc123'));

    expect(syncPort.recordRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0 }),
    );
  });

  it('should cap a fixed discount by the order amount', async () => {
    const fixed = {
      ...baseEntity,
      discountType: DiscountType.FIXED,
      discountValue: 100,
    };
    writeRepo.findById.mockResolvedValue(fixed);
    writeRepo.incrementUsage.mockResolvedValue({
      ...fixed,
      usedCount: 1,
      version: 2,
    });

    await handler.execute(new RedeemPromoCodeCommand('abc123', 40));

    expect(syncPort.recordRedemption).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 40 }),
    );
  });
});
