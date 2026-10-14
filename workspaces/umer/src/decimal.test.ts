import { expect, test } from 'vitest';
import { parseMoneyJson, validAmount, amountLabel } from './decimal';
import { toRequest } from './forms';
test('legacy numeric JSON and new string DTOs preserve full database precision', () => {
  expect(
    parseMoneyJson(
      '{"amount":999999999999999.1234,"count":2,"name":"amount: 0.1"}',
    ),
  ).toEqual({ amount: '999999999999999.1234', count: 2, name: 'amount: 0.1' });
  expect(parseMoneyJson('{"amount":"0.1000"}')).toEqual({ amount: '0.1000' });
  expect(
    toRequest('opportunities', {
      name: 'Exact',
      amount: '999999999999999.1234',
      currency: 'USD',
      companyId: 'id',
    }).amount,
  ).toBe('999999999999999.1234');
  expect(amountLabel('999999999999999.1234')).toBe('999,999,999,999,999.1234');
});
test.each(['-1', 'Infinity', '1e5', '0.12345', '1000000000000000', 'bad'])(
  'rejects unsafe amount %s',
  (value) => expect(validAmount(value)).toBe(false),
);
