import { normalizePhone, phoneToDigits } from './phone';
import { SEED_USERS } from '../seed/seed.data';

describe('normalizePhone', () => {
  it.each([
    ['+79991234567', '+79991234567'],
    ['79991234567', '+79991234567'],
    ['89991234567', '+79991234567'],
    ['9991234567', '+79991234567'],
    ['+7 999 123-45-67', '+79991234567'],
    ['8 (999) 123-45-67', '+79991234567'],
    ['  +7(999)1234567  ', '+79991234567'],
    ['+7 916 123 45 01', '+79161234501'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    ['+74951234567', 'RU landline, not a mobile number'],
    ['+70001234567', 'non-existent RU range'],
    ['+7000', 'too short'],
    ['12345', 'not a phone number'],
    ['+380991234567', 'not a RU number'],
    ['+1 202 555 0143', 'not a RU number'],
    ['', 'empty'],
    ['   ', 'blank'],
    ['abcdefghij', 'letters'],
    ['звоните +79991234567', 'number must be the whole input, not extracted'],
    ['+79991234567 доб. 12', 'trailing extension'],
    ['+799912345678', 'one digit too many'],
    ['+7999123456', 'one digit too few'],
  ])('rejects %p (%s)', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it('strips every non-digit for search', () => {
    expect(phoneToDigits('+7 (999) 123-45-67')).toBe('79991234567');
    expect(phoneToDigits('123-45')).toBe('12345');
  });

  it('accepts every seeded phone as a valid RU mobile number', () => {
    for (const user of SEED_USERS) {
      expect(normalizePhone(user.phone)).toBe(user.phone);
    }
  });
});
