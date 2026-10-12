import { afterEach, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import postcss from 'postcss';
import {
  DashboardApplication,
  DashboardView,
  ThemeScope,
  PerformanceChart,
  DataBoundary,
  TaskList,
  PipelineWidget,
  MetricCards,
  themes,
  pipelineTotals,
  resolveTheme,
  readPreference,
  savePreference,
} from './integration';
import type { DashboardData, PipelineStage } from './integration';
const verified: DashboardData = {
  provenance: {
    kind: 'verified',
    label: 'Controlled test snapshot',
    asOf: '2026-10-12T00:00:00Z',
  },
  metrics: [
    {
      id: 'companies',
      label: 'Verified companies',
      value: '7',
      icon: 'Companies',
    },
  ],
  performance: {
    currency: 'EUR',
    points: [{ label: 'Week 1', current: 50, previous: 25 }],
    description: 'Opportunity history',
  },
  pipeline: [],
  opportunities: [],
  tasks: [],
  priorities: [],
  activities: [],
  notifications: [],
};
const hostProps = {
  data: verified,
  user: {
    name: 'Host User',
    initials: 'HU',
    roleLabel: 'Viewer',
    workspaceName: 'Host Tenant',
    authenticated: true,
  },
  period: 'October',
  periods: ['October'],
  onPeriodChange: () => {},
};
afterEach(() => vi.unstubAllGlobals());
test('host-safe dashboard never falls back to fixtures or fabricated metrics', () => {
  const html = renderToStaticMarkup(
    <DashboardView data={verified} period="October" />,
  );
  expect(html).toContain('Verified companies');
  expect(html).toContain('€50.00');
  for (const demo of [
    'Northstar',
    'Sarah',
    '230,000',
    '128',
    '68.4%',
    'sample',
    'Sample',
  ])
    expect(html).not.toContain(demo);
  for (const empty of [
    'No upcoming tasks',
    'No pipeline data',
    'No recent activities',
    'No opportunities',
    'No priority actions',
  ])
    expect(html).toContain(empty);
  expect(html).not.toContain('vs. previous period');
});
test('shell accepts host user, route renderer and provided load state', () => {
  const html = renderToStaticMarkup(
    <DashboardApplication
      {...hostProps}
      page="Companies"
      renderPage={(p) => <p>Host route: {p}</p>}
    />,
  );
  expect(html).toContain('Host User');
  expect(html).toContain('Host Tenant');
  expect(html).toContain('Host route: Companies');
  expect(html).not.toContain('Preview data state');
  expect(html).not.toContain('Asad');
  expect(html).not.toContain('class="nav-count');
  const loading = renderToStaticMarkup(
    <DashboardApplication {...hostProps} state="loading" demoControls />,
  );
  expect(loading).toContain('aria-busy="true"');
  expect(loading).not.toContain('Verified companies');
  expect(loading).not.toContain('Demonstration of');
  const error = renderToStaticMarkup(
    <DataBoundary state="error" retry={() => {}}>
      hidden
    </DataBoundary>,
  );
  expect(error).toContain('Retry');
  expect(error).not.toContain('Simulated');
  expect(error).not.toContain('private-content-marker');
});
test('currencies remain separate in totals, pipeline and chart labels', () => {
  const stages: PipelineStage[] = [
    {
      id: 'one',
      stage: 'QUALIFICATION',
      count: 2,
      totals: [
        { amount: 10, currency: 'USD' },
        { amount: 20, currency: 'EUR' },
      ],
    },
    {
      id: 'two',
      stage: 'PROPOSAL',
      count: 1,
      totals: [{ amount: 5, currency: 'USD' }],
    },
  ];
  expect(pipelineTotals(stages)).toEqual([
    { currency: 'USD', amount: 15 },
    { currency: 'EUR', amount: 20 },
  ]);
  const html = renderToStaticMarkup(<PipelineWidget stages={stages} />);
  expect(html).toContain('$15.00 USD');
  expect(html).toContain('€20.00 EUR');
  expect(html).not.toContain('$35');
  expect(() =>
    pipelineTotals([
      {
        id: 'bad',
        stage: 'Bad',
        count: 1,
        totals: [{ amount: NaN, currency: 'USD' }],
      },
    ]),
  ).toThrow('Invalid monetary');
  const chart = renderToStaticMarkup(
    <PerformanceChart series={verified.performance} />,
  );
  expect(chart).toContain('Week 1: opportunity value €50.00; previous €25.00');
  expect(chart).toContain('tabindex="0"');
  expect(
    renderToStaticMarkup(
      <PerformanceChart
        series={{
          ...verified.performance,
          points: [{ label: 'Bad', current: -1 }],
        }}
      />,
    ),
  ).toContain('Performance data is invalid');
});
test('task state is controlled and absent mutation handlers are read-only', () => {
  const tasks = [
    {
      id: 'task-id',
      title: 'Host task',
      detail: 'Due tomorrow',
      initials: 'HT',
      completed: true,
    },
  ];
  const html = renderToStaticMarkup(<TaskList tasks={tasks} />);
  expect(html).toContain('checked');
  expect(html).toContain('disabled');
  expect(html).toContain('Host task');
  expect(tasks[0].completed).toBe(true);
  const writable = renderToStaticMarkup(
    <TaskList tasks={tasks} onToggle={() => {}} />,
  );
  expect(writable).not.toContain('disabled');
  expect(
    renderToStaticMarkup(
      <MetricCards
        metrics={[
          { id: 'x', label: 'No comparison', value: '3', icon: 'Companies' },
        ]}
      />,
    ),
  ).not.toContain('vs. previous');
});
test('four themes render in isolated scopes and preferences survive restricted storage', () => {
  for (const theme of themes)
    expect(
      renderToStaticMarkup(<ThemeScope theme={theme}>Widget</ThemeScope>),
    ).toContain(`data-theme="${theme}"`);
  const storage = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  savePreference('host-theme', 'Arctic Light');
  expect(resolveTheme(readPreference('host-theme', 'Midnight Glass'))).toBe(
    'Arctic Light',
  );
  expect(
    renderToStaticMarkup(
      <DashboardApplication {...hostProps} preferenceKey="host" />,
    ),
  ).toContain('data-theme="Arctic Light"');
  expect(resolveTheme('invalid')).toBe('Midnight Glass');
  vi.stubGlobal('window', {
    get localStorage() {
      throw new Error('blocked');
    },
  });
  expect(readPreference('x', 'fallback')).toBe('fallback');
  expect(() => savePreference('x', 'y')).not.toThrow();
});
test('reusable styles and transitive exports cannot leak global resets or demo startup', () => {
  for (const file of ['dashboard.css', 'themes.css']) {
    const parsed = postcss.parse(
      readFileSync(new URL(file, import.meta.url), 'utf8'),
    );
    parsed.walkRules((rule) => {
      for (const selector of rule.selector.split(','))
        expect(selector.trim()).toMatch(
          /^(\.wautech-dashboard|:where\(\.wautech-dashboard\))/,
        );
    });
  }
  expect(
    readFileSync(new URL('dashboard.css', import.meta.url), 'utf8'),
  ).toContain('prefers-reduced-motion');
  const visited = new Set<string>();
  function visit(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    expect(file).not.toMatch(
      /(?:demo|DemoDirectory|App|main|components|data)\.(?:tsx|ts)$/,
    );
    expect(source).not.toMatch(/createRoot\(|fetch\(/);
    for (const match of source.matchAll(
      /(?:from|import)\s*['"](\.\/[^'"]+)['"]/g,
    )) {
      const base = resolve(dirname(file), match[1]);
      let target: string | undefined;
      for (const suffix of ['.ts', '.tsx']) {
        try {
          readFileSync(base + suffix);
          target = base + suffix;
          break;
        } catch {
          /* Resolve source imports only. */
        }
      }
      if (target) visit(target);
    }
  }
  visit(
    new URL('integration.ts', import.meta.url).pathname.replace(
      /^\/(.:)/,
      '$1',
    ),
  );
});
