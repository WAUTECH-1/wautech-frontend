/** Dependency-free browser smoke runner for the connected Codex browser Tab API.
 * Run only against tests/preview.html: all identities and writes are in-memory mocks.
 * Import this module in cua_repl and pass its bound tab to runAdministrationSmoke.
 */
export async function runAdministrationSmoke(tab) {
  const results = [];
  const snapshot = () => tab.getAXState({ emit: false, disableDiffing: true });
  const check = (condition, name) => {
    if (!condition) throw new Error(`Smoke failed: ${name}`);
    results.push(name);
  };
  const button = (name) =>
    tab.playwright.getByRole('button', { name, exact: true });
  const saved = async () => {
    await button('Confirm').waitFor({ state: 'hidden' });
    await tab.playwright
      .getByText('Change saved.', { exact: true })
      .waitFor({ state: 'visible' });
  };
  await tab.goto('http://127.0.0.1:5176/tests/preview.html');
  await tab.playwright
    .getByLabel('Organization', { exact: true })
    .selectOption('22222222-2222-4222-8222-222222222222');
  await snapshot();
  await button('Administration').click();
  await tab.playwright
    .getByRole('table', { name: 'Current organization memberships' })
    .waitFor({ state: 'visible' });
  check(
    (await snapshot()).includes('Current organization memberships'),
    'admin membership screen',
  );
  const ownRole = tab.playwright.getByLabel(
    'Role for 11111111-1111-4111-8111-111111111111',
  );
  check(!(await ownRole.isEnabled()), 'self role changes disabled');
  const role = tab.playwright.getByLabel(
    'Role for 33333333-3333-4333-8333-333333333333',
  );
  await role.selectOption('SALES_USER');
  check((await snapshot()).includes('Confirm change'), 'role confirmation');
  await button('Cancel').click();
  check(
    (await role.evaluate((element) => element.value)) === 'VIEWER',
    'role cancel leaves saved role',
  );
  await role.selectOption('SALES_USER');
  await snapshot();
  await button('Confirm').click();
  await saved();
  check(
    (await role.evaluate((element) => element.value)) === 'SALES_USER',
    'confirmed role change',
  );
  await button('Deactivate').last().click();
  await snapshot();
  await button('Confirm').click();
  await saved();
  check((await snapshot()).includes('SUSPENDED'), 'deactivation');
  await button('Activate').click();
  await snapshot();
  await button('Confirm').click();
  await saved();
  check(!(await snapshot()).includes('SUSPENDED'), 'reactivation');
  await tab.playwright
    .getByLabel('Existing user ID', { exact: true })
    .fill('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await button('Create membership').click();
  check(
    (await snapshot()).includes('No invitation email will be sent'),
    'creation explicitly excludes email delivery',
  );
  await button('Confirm').click();
  await saved();
  check((await snapshot()).includes('INVITED'), 'new membership is invited');
  await button('Profile').click();
  await snapshot();
  await tab.playwright.getByLabel('First name', { exact: true }).fill('Sprint');
  await button('Save profile').click();
  await tab.playwright
    .getByText('Profile saved.', { exact: false })
    .waitFor({ state: 'visible' });
  check((await snapshot()).includes('Profile saved'), 'profile save');
  await button('Account').click();
  await tab.playwright
    .getByRole('heading', { name: 'Security', exact: true })
    .waitFor({ state: 'visible' });
  check(
    (await snapshot()).includes('multi-factor authentication are unavailable'),
    'unsupported security services',
  );
  await tab.playwright
    .getByLabel('Organization', { exact: true })
    .selectOption('33333333-3333-4333-8333-333333333333');
  await snapshot();
  await button('Administration').waitFor({ state: 'hidden' });
  check(
    (await button('Administration').count()) === 0,
    'viewer administration navigation hidden',
  );
  await tab.back();
  await tab.playwright
    .getByLabel('First name', { exact: true })
    .waitFor({ state: 'visible' });
  check(
    (await snapshot()).includes('Your profile'),
    'History API back retains session',
  );
  await tab.forward();
  await snapshot();
  await button('Sign out').click();
  await snapshot();
  await button('Confirm').click();
  await button('Sign in').waitFor({ state: 'visible' });
  const signedOut = await snapshot();
  check(
    signedOut.includes('Sign in') &&
      !signedOut.includes('Current organization memberships'),
    'logout clears protected content',
  );
  await tab.goto(
    'http://127.0.0.1:5176/tests/preview.html?route=/administration',
  );
  await tab.playwright
    .getByLabel('Organization', { exact: true })
    .selectOption('33333333-3333-4333-8333-333333333333');
  await tab.playwright
    .getByRole('heading', { name: 'Access denied', exact: true })
    .waitFor({ state: 'visible' });
  check(
    !(await snapshot()).includes('Current organization memberships'),
    'direct viewer administration URL forbidden',
  );
  await tab.goto(
    'http://127.0.0.1:5176/tests/preview.html?route=/profile&expireProfile=1',
  );
  await tab.playwright
    .getByRole('heading', { name: 'Your session expired', exact: true })
    .waitFor({ state: 'visible' });
  check(
    !(await snapshot()).includes('Save profile'),
    'expired API session removes private form',
  );
  return results;
}
