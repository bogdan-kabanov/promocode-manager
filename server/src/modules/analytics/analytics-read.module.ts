import { Module } from '@nestjs/common';
import { ClickhouseModule } from '../../infrastructure/clickhouse/clickhouse.module';
import { AnalyticsReadRepository } from './analytics-read.repository';

/**
 * The only module allowed to read from ClickHouse. Domain modules import this
 * one instead of `ClickhouseModule`, so no domain service can ever reach the
 * ClickHouse client directly.
 */
@Module({
  imports: [ClickhouseModule],
  providers: [AnalyticsReadRepository],
  exports: [AnalyticsReadRepository],
})
export class AnalyticsReadModule {}
