import { computePromocodeState, PromocodeStateInput } from './promocode-state';

const NOW = new Date('2026-08-06T12:00:00.000Z');
const PAST = new Date('2026-07-01T00:00:00.000Z');
const FUTURE = new Date('2026-09-01T00:00:00.000Z');

function promocode(overrides: Partial<PromocodeStateInput> = {}): PromocodeStateInput {
  return {
    isActive: true,
    usedCount: 0,
    maxUsagesTotal: null,
    validFrom: null,
    validUntil: null,
    ...overrides,
  };
}

describe('computePromocodeState', () => {
  it('is ACTIVE when nothing restricts it', () => {
    expect(computePromocodeState(promocode(), NOW)).toBe('ACTIVE');
  });

  it('is ACTIVE inside the validity window', () => {
    expect(
      computePromocodeState(promocode({ validFrom: PAST, validUntil: FUTURE }), NOW),
    ).toBe('ACTIVE');
  });

  it('is SCHEDULED before validFrom', () => {
    expect(computePromocodeState(promocode({ validFrom: FUTURE }), NOW)).toBe('SCHEDULED');
  });

  it('is EXPIRED at or after validUntil (half-open window)', () => {
    expect(computePromocodeState(promocode({ validUntil: PAST }), NOW)).toBe('EXPIRED');
    expect(computePromocodeState(promocode({ validUntil: NOW }), NOW)).toBe('EXPIRED');
    expect(
      computePromocodeState(promocode({ validUntil: new Date(NOW.getTime() + 1) }), NOW),
    ).toBe('ACTIVE');
  });

  it('is EXHAUSTED once usedCount reaches maxUsagesTotal', () => {
    expect(
      computePromocodeState(promocode({ usedCount: 5, maxUsagesTotal: 5 }), NOW),
    ).toBe('EXHAUSTED');
    expect(
      computePromocodeState(promocode({ usedCount: 4, maxUsagesTotal: 5 }), NOW),
    ).toBe('ACTIVE');
  });

  it('stays ACTIVE without a total limit no matter how often it was used', () => {
    expect(computePromocodeState(promocode({ usedCount: 99 }), NOW)).toBe('ACTIVE');
  });

  it('is DISABLED whenever isActive is false', () => {
    expect(computePromocodeState(promocode({ isActive: false }), NOW)).toBe('DISABLED');
  });

  describe('priority DISABLED > EXHAUSTED > EXPIRED > SCHEDULED > ACTIVE', () => {
    it('DISABLED wins over everything', () => {
      expect(
        computePromocodeState(
          promocode({
            isActive: false,
            usedCount: 5,
            maxUsagesTotal: 5,
            validFrom: FUTURE,
            validUntil: PAST,
          }),
          NOW,
        ),
      ).toBe('DISABLED');
    });

    it('EXHAUSTED wins over EXPIRED and SCHEDULED', () => {
      expect(
        computePromocodeState(
          promocode({ usedCount: 5, maxUsagesTotal: 5, validUntil: PAST, validFrom: FUTURE }),
          NOW,
        ),
      ).toBe('EXHAUSTED');
    });

    it('EXPIRED wins over SCHEDULED', () => {
      expect(
        computePromocodeState(promocode({ validUntil: PAST, validFrom: FUTURE }), NOW),
      ).toBe('EXPIRED');
    });
  });
});
