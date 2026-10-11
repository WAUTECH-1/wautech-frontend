import type { LoginInput } from './types';

export function validateLogin(input: LoginInput) {
  const errors: { email?: string; password?: string } = {};
  const email = input.email.trim();
  if (!email) errors.email = 'Enter your work email.';
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Enter a valid email address.';
  if (!input.password.trim()) errors.password = 'Enter your password.';
  else if (new TextEncoder().encode(input.password).length > 72)
    errors.password = 'Your password exceeds the supported 72-byte limit.';
  return errors;
}
