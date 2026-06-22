import { GetAnalyticsHandler } from './get-analytics.handler';
import { PromoCodeReadRepository } from '../ports/promocode.read-repository';
import { RedisService } from '../../../../infrastructure/redis/redis.service';

describe('GetAnalyticsHandler', () => {
  let handler: GetAnalyticsHandler;
  let readRepo: jest.Mocked<Pick<PromoCodeReadRepository, 'analytics'>>;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set'>>;

  const mockSummary = {
    totalPromocodes: 10,
    activePromocodes: 7,
    totalRedemptions: 50,
    totalDiscountGiven: 5000,
    byStatus: [{ status: 'ACTIVE', count: 7 }],
    redemptionsByDay: [{ day: '2026-06-22', count: 10, amount: 1000 }],
    topPromocodes: [{ code: 'TOP', redemptions: 15, amount: 1500 }],
  };

  beforeEach(() => {
    readRepo = {
      analytics: jest.fn().mockResolvedValue(mockSummary),
    };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    handler = new GetAnalyticsHandler(
      readRepo as any,
      redis as any,
    );
  });

  it('should return cached data if available', async () => {
    redis.get.mockResolvedValue(mockSummary);

    const result = await handler.execute();

    expect(result).toEqual(mockSummary);
    expect(readRepo.analytics).not.toHaveBeenCalled();
  });

  it('should fetch from ClickHouse and cache if not cached', async () => {
    redis.get.mockResolvedValue(null);

    const result = await handler.execute();

    expect(result).toEqual(mockSummary);
    expect(readRepo.analytics).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith('analytics:summary', mockSummary, 30);
  });
});
