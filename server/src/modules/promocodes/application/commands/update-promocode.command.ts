import { UpdatePromoCodeData } from '../ports/promocode.write-repository';

export class UpdatePromoCodeCommand {
  constructor(
    public readonly id: string,
    public readonly data: UpdatePromoCodeData,
  ) {}
}
