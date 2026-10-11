import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';

test('renders independent development access without exposing credentials', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('Connect to your CRM');
  expect(html).toContain('Organization UUID');
  expect(html).toContain('Use existing backend session');
  expect(html).toContain('type="password"');
});
