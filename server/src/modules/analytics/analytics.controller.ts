import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ListResult } from '../../common/dto/list-request.dto';
import {
  AnalyticsService,
  PromocodeAnalyticsResponse,
  UsageAnalyticsResponse,
  UserAnalyticsResponse,
} from './analytics.service';
import {
  FetchPromocodeAnalyticsDto,
  FetchUsageAnalyticsDto,
  FetchUserAnalyticsDto,
} from './dto/analytics.dto';

/** The only endpoints that accept `dateFrom` / `dateTo`. */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('users/fetch/many')
  @HttpCode(HttpStatus.OK)
  users(@Body() dto: FetchUserAnalyticsDto): Promise<ListResult<UserAnalyticsResponse>> {
    return this.analytics.fetchUsers(dto);
  }

  @Post('promocodes/fetch/many')
  @HttpCode(HttpStatus.OK)
  promocodes(
    @Body() dto: FetchPromocodeAnalyticsDto,
  ): Promise<ListResult<PromocodeAnalyticsResponse>> {
    return this.analytics.fetchPromocodes(dto);
  }

  @Post('usages/fetch/many')
  @HttpCode(HttpStatus.OK)
  usages(@Body() dto: FetchUsageAnalyticsDto): Promise<ListResult<UsageAnalyticsResponse>> {
    return this.analytics.fetchUsages(dto);
  }
}
