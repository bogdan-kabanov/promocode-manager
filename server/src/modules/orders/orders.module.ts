import { Module } from '@nestjs/common';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { AnalyticsReadModule } from '../analytics/analytics-read.module';
import { PromocodesRepositoryModule } from '../promocodes/promocodes-repository.module';
import { UsersRepositoryModule } from '../users/users-repository.module';
import { OrdersRepositoryModule } from './orders-repository.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    OrdersRepositoryModule,
    PromocodesRepositoryModule,
    UsersRepositoryModule,
    AnalyticsReadModule,
    OutboxModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
