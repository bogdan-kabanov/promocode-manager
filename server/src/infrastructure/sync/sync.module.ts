import { Module } from '@nestjs/common';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { OutboxModule } from '../outbox/outbox.module';
import { OutboxWorker } from './outbox.worker';

/** Consumer half of the outbox: the only writer into ClickHouse. */
@Module({
  imports: [OutboxModule, ClickhouseModule],
  providers: [OutboxWorker],
  exports: [OutboxWorker],
})
export class SyncModule {}
