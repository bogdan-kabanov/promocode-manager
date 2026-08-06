import { Module } from '@nestjs/common';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { AnalyticsReadModule } from '../analytics/analytics-read.module';
import { PromocodesRepositoryModule } from './promocodes-repository.module';
import { PromocodesController } from './promocodes.controller';
import { PromocodesService } from './promocodes.service';

@Module({
  imports: [PromocodesRepositoryModule, AnalyticsReadModule, OutboxModule],
  controllers: [PromocodesController],
  providers: [PromocodesService],
  exports: [PromocodesService],
})
export class PromocodesModule {}
