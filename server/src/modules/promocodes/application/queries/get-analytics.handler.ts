import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAnalyticsQuery } from './get-analytics.query';
import {
  AnalyticsSummary,
  PROMOCODE_READ_REPOSITORY,
  PromoCodeReadRepository,
} from '../ports/promocode.read-repository';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { ANALYTICS_SUMMARY_KEY } from './cache-keys';

@QueryHandler(GetAnalyticsQuery)
export class GetAnalyticsHandler
  implements IQueryHandler<GetAnalyticsQuery, AnalyticsSummary>
{
  constructor(
    @Inject(PROMOCODE_READ_REPOSITORY)
    private readonly readRepo: PromoCodeReadRepository,
    private readonly redis: RedisService,
  ) {}

  async execute(): Promise<AnalyticsSummary> {
    const cached = await this.redis.get<AnalyticsSummary>(ANALYTICS_SUMMARY_KEY);
    if (cached) return cached;

    const summary = await this.readRepo.analytics();
    await this.redis.set(ANALYTICS_SUMMARY_KEY, summary, 30);
    return summary;
  }
}
