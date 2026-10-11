import { expect, test } from 'vitest';
import { leadTransitions, stageTransitions } from './contracts';
import type { Contact } from './contracts';
import { paginate, toRequest, validate } from './forms';
test('required, length and email validation', () => {
  expect(validate('companies', { name: ' ', email: 'bad' })).toHaveProperty(
    'name',
  );
  expect(validate('companies', { name: 'x'.repeat(201) })).toHaveProperty(
    'name',
  );
  expect(
    validate('contacts', { firstName: 'A', lastName: 'B', email: 'bad' }),
  ).toHaveProperty('companyId');
  expect(validate('leads', { firstName: 'A', lastName: 'B' })).toEqual({});
});
test('opportunity requires paired money and matching company contact', () => {
  const companyId = '12345678-1234-1234-1234-123456789abc';
  const contactId = '12345678-1234-1234-1234-123456789abd';
  const values = {
    name: 'Deal',
    companyId,
    contactId,
    amount: '0',
    currency: 'USD',
  };
  expect(
    validate('opportunities', values, [
      { id: contactId, companyId } as Contact,
    ]),
  ).toEqual({});
  expect(
    validate('opportunities', values, [
      { id: contactId, companyId: contactId } as Contact,
    ]),
  ).toHaveProperty('contactId');
  expect(
    validate('opportunities', { ...values, amount: '-1', currency: 'usd' }),
  ).toHaveProperty('amount');
  expect(validate('opportunities', { ...values, currency: '' })).toHaveProperty(
    'currency',
  );
});
test('DTO serialization excludes response metadata and lead status', () => {
  expect(
    toRequest('leads', {
      firstName: ' A ',
      lastName: 'B',
      status: 'QUALIFIED',
      id: 'ignored',
    }),
  ).toEqual({
    companyId: null,
    firstName: 'A',
    lastName: 'B',
    email: null,
    phone: null,
    jobTitle: null,
  });
  expect(
    toRequest('opportunities', {
      name: 'Deal',
      amount: '0',
      currency: 'USD',
      companyId: 'id',
    }).amount,
  ).toBe(0);
});
test('pagination handles empty, final and stale pages', () => {
  expect(paginate([], 9, 10)).toEqual({
    items: [],
    page: 1,
    pages: 1,
    total: 0,
  });
  expect(
    paginate(
      Array.from({ length: 23 }, (_, i) => i),
      3,
      10,
    ).items,
  ).toEqual([20, 21, 22]);
  expect(paginate([1, 2], 5, 10).page).toBe(1);
});
test('only backend-defined forward transitions are exposed', () => {
  expect(leadTransitions.NEW).toEqual([
    'CONTACTED',
    'QUALIFIED',
    'DISQUALIFIED',
  ]);
  expect(leadTransitions.QUALIFIED).toEqual([]);
  expect(stageTransitions.PROPOSAL).toEqual(['NEGOTIATION', 'CLOSED_LOST']);
  expect(stageTransitions.CLOSED_WON).toEqual([]);
});
