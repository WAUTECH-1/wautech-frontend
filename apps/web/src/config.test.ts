import { expect, test } from 'vitest';
import { apiConfiguration } from './config';
import { devProxyTarget } from '../dev-proxy';
test.each([undefined, '', '/'])('same-origin configuration: %s', (value) => {
  expect(apiConfiguration(value)).toEqual({
    baseUrl: '',
    transport: 'session-cookie',
    tenantDiscovery: 'backend-membership',
  });
});
test('allows HTTPS and loopback dev origins', () => {
  expect(apiConfiguration('https://crm.example.test').baseUrl).toBe(
    'https://crm.example.test',
  );
  expect(apiConfiguration('http://localhost:8080').baseUrl).toBe(
    'http://localhost:8080',
  );
  expect(devProxyTarget()).toBe('http://localhost:8080');
});
test.each([
  'http://crm.example.test',
  'https://user:secret@example.test',
  'https://example.test/api',
  'https://example.test?token=secret',
  'javascript:alert(1)',
  'https://example.test/#fragment',
])('rejects unsafe browser origins: %s', (value) => {
  expect(() => apiConfiguration(value)).toThrow();
});
test.each([
  'file:///tmp/api',
  'https://user:secret@example.test',
  'https://example.test/api',
  'https://example.test?secret=1',
])('rejects invalid proxy origin: %s', (value) => {
  expect(() => devProxyTarget(value)).toThrow();
});
