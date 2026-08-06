import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ListResult } from '../../common/dto/list-request.dto';
import { ParseMongoIdPipe } from '../../common/mongo-id.pipe';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthenticatedUser } from '../auth/auth.types';
import { OrderResponse } from './order.mapper';
import { OrdersService } from './orders.service';
import { ApplyPromocodeDto, CreateOrderDto, FetchOrdersDto } from './dto/orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('fetch/many')
  @HttpCode(HttpStatus.OK)
  fetchMany(
    @Body() dto: FetchOrdersDto,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<ListResult<OrderResponse>> {
    return this.orders.fetchMany(dto, current.mongoId);
  }

  @Get('fetch/one/:mongo_id')
  fetchOne(
    @Param('mongo_id', ParseMongoIdPipe) mongoId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<OrderResponse> {
    return this.orders.fetchOne(mongoId, current.mongoId);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<OrderResponse> {
    return this.orders.create(dto, current.mongoId);
  }

  @Post('apply-promocode/:mongo_id')
  @HttpCode(HttpStatus.OK)
  applyPromocode(
    @Param('mongo_id', ParseMongoIdPipe) mongoId: string,
    @Body() dto: ApplyPromocodeDto,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<OrderResponse> {
    return this.orders.applyPromocode(mongoId, dto, current.mongoId);
  }
}
