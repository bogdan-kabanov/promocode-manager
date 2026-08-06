import { Module } from '@nestjs/common';
import { ClickhouseService } from './clickhouse.service';

/**
 * Deliberately NOT global: only the analytics read model, the outbox writer and
 * the health check are allowed to import it. Domain services must stay unaware
 * of ClickHouse.
 */
@Module({
  providers: [ClickhouseService],
  exports: [ClickhouseService],
})
export class ClickhouseModule {}
