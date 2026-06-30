export class RedeemPromoCodeCommand {
  constructor(
    public readonly id: string,
    public readonly orderAmount?: number,
  ) {}
}
