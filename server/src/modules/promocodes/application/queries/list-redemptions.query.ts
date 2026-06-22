import { ListRedemptionsParams } from '../ports/promocode.read-repository';

export class ListRedemptionsQuery {
  constructor(public readonly params: ListRedemptionsParams) {}
}
