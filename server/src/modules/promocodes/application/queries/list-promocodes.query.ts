import { ListPromoCodesParams } from '../ports/promocode.read-repository';

export class ListPromoCodesQuery {
  constructor(public readonly params: ListPromoCodesParams) {}
}
