import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ListResult } from '../../common/dto/list-request.dto';
import { ParseMongoIdPipe } from '../../common/mongo-id.pipe';
import { PromocodeResponse } from './promocode.mapper';
import { PromocodesService } from './promocodes.service';
import {
  CreatePromocodeDto,
  FetchPromocodesDto,
  UpdatePromocodeDto,
} from './dto/promocodes.dto';

@Controller('promocodes')
export class PromocodesController {
  constructor(private readonly promocodes: PromocodesService) {}

  @Post('fetch/many')
  @HttpCode(HttpStatus.OK)
  fetchMany(@Body() dto: FetchPromocodesDto): Promise<ListResult<PromocodeResponse>> {
    return this.promocodes.fetchMany(dto);
  }

  @Get('fetch/one/:mongo_id')
  fetchOne(@Param('mongo_id', ParseMongoIdPipe) mongoId: string): Promise<PromocodeResponse> {
    return this.promocodes.fetchOne(mongoId);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePromocodeDto): Promise<PromocodeResponse> {
    return this.promocodes.create(dto);
  }

  @Put('update/:mongo_id')
  update(
    @Param('mongo_id', ParseMongoIdPipe) mongoId: string,
    @Body() dto: UpdatePromocodeDto,
  ): Promise<PromocodeResponse> {
    return this.promocodes.update(mongoId, dto);
  }

  @Post('activate/:mongo_id')
  @HttpCode(HttpStatus.OK)
  activate(@Param('mongo_id', ParseMongoIdPipe) mongoId: string): Promise<PromocodeResponse> {
    return this.promocodes.setActive(mongoId, true);
  }

  @Post('deactivate/:mongo_id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('mongo_id', ParseMongoIdPipe) mongoId: string): Promise<PromocodeResponse> {
    return this.promocodes.setActive(mongoId, false);
  }
}
