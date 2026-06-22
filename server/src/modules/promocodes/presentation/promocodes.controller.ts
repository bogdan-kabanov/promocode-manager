import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreatePromoCodeCommand } from '../application/commands/create-promocode.command';
import { UpdatePromoCodeCommand } from '../application/commands/update-promocode.command';
import { DeletePromoCodeCommand } from '../application/commands/delete-promocode.command';
import { RedeemPromoCodeCommand } from '../application/commands/redeem-promocode.command';
import { ListPromoCodesQuery } from '../application/queries/list-promocodes.query';
import { CreatePromoCodeDto } from './dto/create-promocode.dto';
import { UpdatePromoCodeDto } from './dto/update-promocode.dto';
import { ListPromoCodesQueryDto } from './dto/list-query.dto';
import { PromoCodeStatus } from '../domain/promocode.types';

@Controller('promocodes')
export class PromoCodesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  list(@Query() query: ListPromoCodesQueryDto) {
    return this.queryBus.execute(
      new ListPromoCodesQuery({
        page: query.page,
        pageSize: query.pageSize,
        sortField: query.sortField,
        sortOrder: query.sortOrder,
        search: query.search,
        status: query.status,
      }),
    );
  }

  @Post()
  create(@Body() dto: CreatePromoCodeDto) {
    return this.commandBus.execute(
      new CreatePromoCodeCommand(
        dto.code.toUpperCase().trim(),
        dto.description ?? '',
        dto.discountType,
        dto.discountValue,
        dto.maxUsages,
        dto.status ?? PromoCodeStatus.ACTIVE,
        new Date(dto.startsAt),
        dto.expiresAt ? new Date(dto.expiresAt) : null,
      ),
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromoCodeDto) {
    return this.commandBus.execute(
      new UpdatePromoCodeCommand(id, {
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxUsages: dto.maxUsages,
        status: dto.status,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt:
          dto.expiresAt === undefined
            ? undefined
            : dto.expiresAt
              ? new Date(dto.expiresAt)
              : null,
      }),
    );
  }

  @Post(':id/redeem')
  redeem(@Param('id') id: string) {
    return this.commandBus.execute(new RedeemPromoCodeCommand(id));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute(new DeletePromoCodeCommand(id));
  }
}
