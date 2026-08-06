import { Module } from '@nestjs/common';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';
import { SyncModule } from '../infrastructure/sync/sync.module';
import { OrdersRepositoryModule } from '../modules/orders/orders-repository.module';
import { PromocodesRepositoryModule } from '../modules/promocodes/promocodes-repository.module';
import { UsersRepositoryModule } from '../modules/users/users-repository.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    UsersRepositoryModule,
    PromocodesRepositoryModule,
    OrdersRepositoryModule,
    OutboxModule,
    SyncModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
