import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';
import { DataBoundary, PerformanceChart } from './components';
import { deals, money, readPreference, themes } from './data';

test('renders executive widgets with explicit demo provenance and accessible controls', () => {
  const html = renderToStaticMarkup(<App />);
  for (const text of [
    'Executive overview',
    'Demonstration data',
    'Backend is not connected',
    'Opportunity performance',
    'Sales pipeline',
    'Upcoming tasks',
    'Priority actions',
    'Notifications summary',
    'Recent opportunities',
    'Activity feed',
    'Search navigation',
    'Skip to content',
  ])
    expect(html).toContain(text);
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('aria-labelledby="panel-title"');
});
test('loading, empty and error states replace metrics and provide recovery', () => {
  for (const state of ['loading', 'empty', 'error'] as const) {
    const html = renderToStaticMarkup(
      <DataBoundary state={state} retry={() => {}}>
        private metric
      </DataBoundary>,
    );
    expect(html).not.toContain('private metric');
    expect(html).toContain('Return to demo data');
    expect(html).toContain(
      state === 'error' ? 'role="alert"' : 'role="status"',
    );
  }
});
test('chart period changes values and exposes keyboard-readable samples', () => {
  const current = renderToStaticMarkup(
    <PerformanceChart period="This quarter" />,
  );
  expect(current).toContain('tabindex="0"');
  expect(current).toContain(
    'aria-label="Sample 1: opportunity value 22 thousand dollars"',
  );
  expect(current).not.toBe(
    renderToStaticMarkup(<PerformanceChart period="Last quarter" />),
  );
});
test('sample pipeline totals reconcile, themes are distinct and SSR preferences are safe', () => {
  expect(money(deals.reduce((sum, deal) => sum + deal.value, 0))).toBe(
    '$230,000',
  );
  expect(new Set(themes).size).toBe(4);
  expect(readPreference('missing', 'fallback')).toBe('fallback');
});
