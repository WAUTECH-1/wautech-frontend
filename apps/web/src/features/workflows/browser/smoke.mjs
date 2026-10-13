/* global document */
/** Runs through CUA against the disposable fixture only. */
export async function runWorkflowSmoke(tab) {
  const results = [],
    button = (name) =>
      tab.playwright.getByRole('button', { name, exact: true }),
    label = (name) => tab.playwright.getByLabel(name, { exact: true });
  const state = async () =>
    (await tab.getAXState({ emit: false, disableDiffing: true })).replace(
      /\s+/g,
      ' ',
    );
  const check = (value, name) => {
    if (!value) throw Error(`Workflow smoke failed: ${name}`);
    results.push(name);
  };
  const wait = (name) => button(name).waitFor({ state: 'visible' });
  const fixture =
    'http://127.0.0.1:5177/src/features/workflows/browser/preview.html';
  await tab.goto(fixture);
  await label('Organization').selectOption(
    '22222222-2222-4222-8222-222222222222',
  );
  await wait('Fixture task');
  await button('Create task').click();
  await label('Task title').fill('Browser task');
  await label('Related company ID').fill(
    '44444444-4444-4444-8444-444444444444',
  );
  await label('Due date and time (local)').fill('2026-10-20T12:00');
  await button('Save workflow').click();
  await wait('Complete task');
  check(
    (await state()).includes('Browser task'),
    'task create and query-only detail navigation',
  );
  await button('Edit workflow').click();
  await label('Task title').fill('Edited browser task');
  await button('Save workflow').click();
  await wait('Complete task');
  check(
    (await state()).includes('Edited browser task'),
    'task edit and due-date persistence',
  );
  await button('Complete task').click();
  check(
    await tab.playwright.evaluate(
      () => document.activeElement?.textContent === 'Cancel',
    ),
    'confirmation autofocus',
  );
  await button('Cancel').press('Escape');
  await wait('Complete task');
  check(
    await tab.playwright.evaluate(
      () => document.activeElement?.textContent === 'Complete task',
    ),
    'Escape cancellation restores keyboard focus',
  );
  await button('Complete task').click();
  await button('Confirm action').click();
  await wait('Reopen task');
  check((await state()).includes('COMPLETED'), 'complete task');
  await button('Reopen task').click();
  await button('Confirm action').click();
  await wait('Complete task');
  check((await state()).includes('OPEN'), 'reopen task');
  await button('View related activities').click();
  await wait('Create activity');
  check(
    (await state()).includes('related record IDs'),
    'verified relationship deep-link',
  );
  await button('Create activity').click();
  await label('Activity subject').fill('Browser meeting');
  await label('Activity date and time (local)').fill('2026-10-13T10:30');
  await label('Related company ID').fill(
    '44444444-4444-4444-8444-444444444444',
  );
  await button('Save workflow').click();
  await wait('Edit workflow');
  check((await state()).includes('Browser meeting'), 'activity create');
  await button('Edit workflow').click();
  await label('Activity subject').fill('Edited meeting');
  await button('Save workflow').click();
  await wait('Edit workflow');
  check((await state()).includes('Edited meeting'), 'activity edit');
  await button('Archive workflow').click();
  await button('Confirm action').click();
  await wait('Fixture call');
  check(!(await state()).includes('Edited meeting'), 'activity archive');
  await label('Search activities').fill('absent');
  await button('Apply workflow filters').click();
  await tab.playwright
    .getByText('No activities match the current filters.')
    .waitFor({ state: 'visible' });
  check(!(await state()).includes('Fixture call'), 'search empty state');
  await button('Notifications').click();
  await wait('Mark as read');
  check((await state()).includes('1 unread'), 'notification unread count');
  await button('Mark as read').click();
  await tab.playwright.getByText(/^Read ·/).waitFor({ state: 'visible' });
  check(
    !(await state()).includes('Mark as read'),
    'notification read confirmation',
  );
  check((await state()).includes('0 unread'), 'read action refreshes count');
  await tab.goto(fixture + '?route=/notifications');
  await label('Organization').selectOption(
    '22222222-2222-4222-8222-222222222222',
  );
  await wait('Mark as read');
  await button('Mark all as read').click();
  await button('Confirm action').click();
  await tab.playwright
    .getByText('0 unread notifications', { exact: true })
    .waitFor({ state: 'visible' });
  check((await state()).includes('0 unread'), 'read-all');
  await button('Tasks').click();
  await wait('Fixture task');
  await button('Fixture task').click();
  await wait('Archive workflow');
  await button('Archive workflow').click();
  await button('Confirm action').click();
  await tab.playwright
    .getByText('No tasks match the current filters.')
    .waitFor({ state: 'visible' });
  check(!(await state()).includes('Fixture task'), 'task archive');
  await button('Switch organization').click();
  await label('Organization').selectOption(
    '33333333-3333-4333-8333-333333333333',
  );
  await button('Tasks').click();
  await tab.playwright
    .getByText('VIEWER/read-only membership:', { exact: false })
    .waitFor({ state: 'visible' });
  check(
    !(await state()).includes('Create task') &&
      !(await state()).includes('Fixture task'),
    'tenant switch clears records and viewer cannot mutate',
  );
  return results;
}
