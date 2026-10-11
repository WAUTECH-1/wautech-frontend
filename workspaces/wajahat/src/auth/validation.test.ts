import { describe, expect, test } from 'vitest';
import { validateLogin } from './validation';

describe('login validation against verified backend constraints', () => {
  test('requires both fields and rejects invalid email', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Enter your work email.',
      password: 'Enter your password.',
    });
    expect(
      validateLogin({ email: 'invalid', password: 'sample' }).email,
    ).toBeDefined();
    expect(
      validateLogin({
        email: 'x'.repeat(250) + '@test.com',
        password: 'sample',
      }).email,
    ).toBeDefined();
  });
  test('trims email but preserves password and imposes no invented password minimum', () => {
    expect(
      validateLogin({ email: ' member@example.test ', password: 'x' }),
    ).toEqual({});
    expect(
      validateLogin({ email: 'member@example.test', password: '   ' }).password,
    ).toBeDefined();
  });
  test('enforces bcrypt byte limit for ASCII and Unicode', () => {
    expect(
      validateLogin({ email: 'member@example.test', password: 'a'.repeat(72) }),
    ).toEqual({});
    expect(
      validateLogin({ email: 'member@example.test', password: 'a'.repeat(73) })
        .password,
    ).toBeDefined();
    expect(
      validateLogin({ email: 'member@example.test', password: 'é'.repeat(37) })
        .password,
    ).toBeDefined();
  });
});
