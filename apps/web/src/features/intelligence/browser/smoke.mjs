/** Run only against the isolated, clearly labeled in-memory fixture. */
export async function runIntelligenceSmoke(tab) {
  const results = [];
  const button = (name) =>
    tab.playwright.getByRole('button', { name, exact: true });
  const snapshot = async () =>
    (await tab.getAXState({ emit: false, disableDiffing: true })).replace(
      /\s+/g,
      ' ',
    );
  const check = (condition, name) => {
    if (!condition) throw new Error(`Smoke failed: ${name}`);
    results.push(name);
  };
  const fixture =
    'http://127.0.0.1:5176/src/features/intelligence/browser/preview.html';
  await tab.goto(fixture);
  await tab.playwright
    .getByLabel('Organization', { exact: true })
    .selectOption('22222222-2222-4222-8222-222222222222');
  await tab.playwright
    .getByRole('heading', { name: 'Open pipeline value', exact: true })
    .waitFor({ state: 'visible' });
  let text = await snapshot();
  check(
    text.includes('USD 0.3') && text.includes('EUR 100.0001'),
    'currency-separated executive totals',
  );
  check(text.includes('Fixture call'), 'recent activity');
  await button('Sales pipeline').click();
  await tab.playwright
    .getByLabel('Search opportunities', { exact: true })
    .waitFor({ state: 'visible' });
  await tab.playwright
    .getByLabel('Pipeline currency', { exact: true })
    .selectOption('USD');
  text = await snapshot();
  check(
    text.includes('Exact USD alpha') && !text.includes('EUR proposal'),
    'currency filter',
  );
  await tab.playwright
    .getByLabel('Pipeline currency', { exact: true })
    .selectOption('');
  await tab.playwright
    .getByLabel('Search opportunities', { exact: true })
    .fill('alpha');
  text = await snapshot();
  check(!text.includes('Exact USD beta'), 'search filter');
  await button('Exact USD alpha').click();
  await tab.playwright
    .getByRole('region', { name: 'Opportunity details' })
    .getByRole('heading', { name: 'Exact USD alpha' })
    .waitFor({ state: 'visible' });
  check(
    (await snapshot()).includes('Open CRM opportunities workspace'),
    'existing CRM detail navigation',
  );
  await button('Close details').click();
  await tab.playwright
    .getByLabel('Next stage for Exact USD alpha', { exact: true })
    .selectOption('NEEDS_ANALYSIS');
  await button('Confirm stage change').waitFor({ state: 'visible' });
  await snapshot();
  await button('Cancel').click();
  check((await snapshot()).includes('QUALIFICATION'), 'cancel stage action');
  await tab.playwright
    .getByLabel('Next stage for Exact USD alpha', { exact: true })
    .selectOption('NEEDS_ANALYSIS');
  await button('Confirm stage change').waitFor({ state: 'visible' });
  await snapshot();
  await button('Confirm stage change').click();
  await tab.playwright
    .getByText('Stage change confirmed by the server.', { exact: true })
    .waitFor({ state: 'visible' });
  check(true, 'confirmed existing CRM stage transition');
  await button('Reports').click();
  await tab.playwright
    .getByRole('heading', { name: 'Lead qualification breakdown', exact: true })
    .waitFor({ state: 'visible' });
  text = await snapshot();
  check(
    text.includes('Qualified share: 100.0%'),
    'defined lead qualification metric',
  );
  check(
    text.includes('recognized revenue') &&
      text.includes('Owner-based summaries'),
    'unsupported metrics labeled',
  );
  await tab.playwright
    .getByLabel('Lead created from (UTC)', { exact: true })
    .fill('2026-10-14');
  await button('Apply lead date filters').click();
  await tab.playwright
    .getByText('0 leads in this creation cohort', { exact: false })
    .waitFor({ state: 'visible' });
  check((await snapshot()).includes('0 leads'), 'lead date cohort filter');
  const downloadPromise = tab.playwright.waitForEvent('download');
  await button('Export authorized report CSV').click();
  const downloaded = await downloadPromise;
  check(!!(await downloaded.path()), 'CSV download');
  await button('Switch organization').click();
  await tab.playwright
    .getByLabel('Organization', { exact: true })
    .selectOption('33333333-3333-4333-8333-333333333333');
  await snapshot();
  await button('Sales pipeline').click();
  await tab.playwright
    .getByText('VIEWER access: opportunity details are read-only.', {
      exact: true,
    })
    .waitFor({ state: 'visible' });
  check(
    (await snapshot()).includes('No opportunities match'),
    'tenant switch clears prior opportunities',
  );
  await tab.goto(fixture + '?fail=leads');
  await tab.playwright
    .getByLabel('Organization', { exact: true })
    .selectOption('22222222-2222-4222-8222-222222222222');
  await tab.playwright
    .getByRole('heading', { name: 'Open pipeline value', exact: true })
    .waitFor({ state: 'visible' });
  text = await snapshot();
  check(
    text.includes('service is unavailable') && text.includes('USD 0.3'),
    'partial outage retains only valid datasets',
  );
  return results;
}
