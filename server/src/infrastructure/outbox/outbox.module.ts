import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxEvent, OutboxEventSchema } from './outbox-event.schema';
import { OutboxService } from './outbox.service';

/**
 * Producer half of the outbox — safe for domain modules to import because it
 * has no ClickHouse dependency at all.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: OutboxEvent.name, schema: OutboxEventSchema }]),
  ],
  providers: [OutboxService],
  exports: [OutboxService, MongooseModule],
})
export class OutboxModule {}
