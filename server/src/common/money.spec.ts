import {
  calculateDiscountKopecks,
  finalAmountKopecks,
  isValidApiMoney,
  toApiNumber,
  toKopecks,
} from './money';

describe('money', () => {
  describe('calculateDiscountKopecks — round half up, once', () => {
    it('1483.05 × 20% = 296.61', () => {
      const amount = toKopecks(1483.05);
      expect(amount).toBe(148305);

      const discount = calculateDiscountKopecks(amount, 20);
      expect(discount).toBe(29661);
      expect(toApiNumber(discount)).toBe(296.61);
      expect(toApiNumber(finalAmountKopecks(amount, discount))).toBe(1186.44);
    });

    it('100.05 × 15% = 15.01 (half up, not 15.00)', () => {
      const amount = toKopecks(100.05);
      expect(amount).toBe(10005);

      const discount = calculateDiscountKopecks(amount, 15);
      // 10005 * 15 / 100 = 1500.75 kopecks -> 1501
      expect(discount).toBe(1501);
      expect(toApiNumber(discount)).toBe(15.01);
      expect(toApiNumber(finalAmountKopecks(amount, discount))).toBe(85.04);
    });

    it('rounds exact halves up', () => {
      // 10 kopecks * 5% = 0.5 kopecks -> 1
      expect(calculateDiscountKopecks(10, 5)).toBe(1);
      // 30 kopecks * 5% = 1.5 kopecks -> 2
      expect(calculateDiscountKopecks(30, 5)).toBe(2);
    });

    it('keeps the boundary percentages exact', () => {
      expect(calculateDiscountKopecks(148305, 100)).toBe(148305);
      expect(calculateDiscountKopecks(148305, 1)).toBe(1483);
      expect(calculateDiscountKopecks(0, 50)).toBe(0);
    });

    it('never lets the final amount go negative', () => {
      expect(finalAmountKopecks(1000, 1000)).toBe(0);
    });
  });

  describe('toApiNumber — exactly two decimals, no float artifacts', () => {
    it('does not produce 296.60999999999996', () => {
      expect(toApiNumber(29661)).toBe(296.61);
      expect(String(toApiNumber(29661))).toBe('296.61');
    });

    it.each([
      [29660, 296.6, '296.6'],
      [1501, 15.01, '15.01'],
      [148305, 1483.05, '1483.05'],
      [118644, 1186.44, '1186.44'],
      [1, 0.01, '0.01'],
      [0, 0, '0'],
      [100_000_000_000, 1_000_000_000, '1000000000'],
    ])('%i kopecks -> %p', (kopecks, expected, printed) => {
      const value = toApiNumber(kopecks);
      expect(value).toBe(expected);
      expect(String(value)).toBe(printed);
    });

    it('round-trips through kopecks without drift', () => {
      for (const rubles of [0.01, 0.1, 1.05, 99.99, 1483.05, 123456.78]) {
        expect(toApiNumber(toKopecks(rubles))).toBe(rubles);
      }
    });

    it('never prints more than two decimals', () => {
      for (let kopecks = 0; kopecks < 1000; kopecks += 7) {
        const printed = String(toApiNumber(kopecks));
        const decimals = printed.split('.')[1] ?? '';
        expect(decimals.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('isValidApiMoney', () => {
    it.each([0, 0.01, 1483.05, 100.05, 999999.99])('accepts %p', (value) => {
      expect(isValidApiMoney(value)).toBe(true);
    });

    it.each([-1, 12.345, Number.NaN, Number.POSITIVE_INFINITY, '10' as unknown])(
      'rejects %p',
      (value) => {
        expect(isValidApiMoney(value)).toBe(false);
      },
    );
  });
});
