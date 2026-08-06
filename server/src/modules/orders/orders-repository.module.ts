import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.schema';
import { OrdersRepository } from './orders.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }])],
  providers: [OrdersRepository],
  exports: [OrdersRepository, MongooseModule],
})
export class OrdersRepositoryModule {}
