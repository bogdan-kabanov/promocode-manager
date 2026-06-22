import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAnalyticsQuery } from '../application/queries/get-analytics.query';
import { ListRedemptionsQuery } from '../application/queries/list-redemptions.query';
import { ListRedemptionsQueryDto } from './dto/list-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  summary() {
    return this.queryBus.execute(new GetAnalyticsQuery());
  }

  @Get('redemptions')
  redemptions(@Query() query: ListRedemptionsQueryDto) {
    return this.queryBus.execute(
      new ListRedemptionsQuery({
        page: query.page,
        pageSize: query.pageSize,
        sortField: query.sortField,
        sortOrder: query.sortOrder,
        code: query.code,
      }),
    );
  }
}
