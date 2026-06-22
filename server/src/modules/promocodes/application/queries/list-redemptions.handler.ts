import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListRedemptionsQuery } from './list-redemptions.query';
import {
  Paginated,
  PROMOCODE_READ_REPOSITORY,
  PromoCodeReadRepository,
} from '../ports/promocode.read-repository';
import { RedemptionView } from '../../domain/promocode.types';

@QueryHandler(ListRedemptionsQuery)
export class ListRedemptionsHandler
  implements IQueryHandler<ListRedemptionsQuery, Paginated<RedemptionView>>
{
  constructor(
    @Inject(PROMOCODE_READ_REPOSITORY)
    private readonly readRepo: PromoCodeReadRepository,
  ) {}

  execute(query: ListRedemptionsQuery): Promise<Paginated<RedemptionView>> {
    return this.readRepo.listRedemptions(query.params);
  }
}
