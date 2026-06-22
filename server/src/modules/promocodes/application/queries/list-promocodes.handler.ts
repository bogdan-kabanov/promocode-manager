import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListPromoCodesQuery } from './list-promocodes.query';
import {
  Paginated,
  PROMOCODE_READ_REPOSITORY,
  PromoCodeReadRepository,
} from '../ports/promocode.read-repository';
import { PromoCodeView } from '../../domain/promocode.types';

@QueryHandler(ListPromoCodesQuery)
export class ListPromoCodesHandler
  implements IQueryHandler<ListPromoCodesQuery, Paginated<PromoCodeView>>
{
  constructor(
    @Inject(PROMOCODE_READ_REPOSITORY)
    private readonly readRepo: PromoCodeReadRepository,
  ) {}

  execute(query: ListPromoCodesQuery): Promise<Paginated<PromoCodeView>> {
    return this.readRepo.list(query.params);
  }
}
