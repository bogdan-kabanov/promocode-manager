import { DiscountType } from '../model/types';

export function DiscountLabel({
  type,
  value,
}: {
  type: DiscountType;
  value: number;
}) {
  return <span>{type === 'PERCENTAGE' ? `${value}%` : `${value}`}</span>;
}
