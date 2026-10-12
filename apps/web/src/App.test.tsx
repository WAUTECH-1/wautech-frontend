import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';
import { ApplicationProvider } from './providers/ApplicationProvider';
test('application startup mounts providers and routes with private content locked', () => {
  const html = renderToStaticMarkup(
    <ApplicationProvider>
      <App />
    </ApplicationProvider>,
  );
  expect(html).toContain('WAUTECH');
  expect(html).toContain('Application navigation');
  expect(html).toContain('Verifying your session');
  expect(html).toContain('Skip to content');
  expect(html).not.toContain('New company');
  expect(html).not.toContain('Verified backend session');
});
