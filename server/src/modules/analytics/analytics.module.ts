import { Module } from '@nestjs/common';
import { AnalyticsReadModule } from './analytics-read.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AnalyticsReadModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
