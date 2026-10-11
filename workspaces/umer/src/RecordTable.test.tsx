import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecordTable } from './RecordTable';
import { Workspace } from './Workspace';
import { CrmApi } from './api';
import type { Company } from './contracts';
const base = {
  resource: 'companies' as const,
  rows: [],
  companies: [],
  loading: false,
  error: false,
  onOpen: () => {},
  onEdit: () => {},
  onArchive: () => {},
};
test('list loading, empty and failure states are distinct', () => {
  expect(renderToStaticMarkup(<RecordTable {...base} loading />)).toContain(
    'Loading records',
  );
  expect(renderToStaticMarkup(<RecordTable {...base} />)).toContain(
    'No companies found',
  );
  expect(renderToStaticMarkup(<RecordTable {...base} error />)).toContain(
    'Records could not be loaded',
  );
});
test('list renders records and accessible operation names', () => {
  const record = {
    id: 'id',
    name: 'Acme & Co',
    status: 'ACTIVE',
    updatedAt: '2026-10-11T00:00:00Z',
    email: null,
    website: null,
    industry: null,
  } as Company;
  const html = renderToStaticMarkup(<RecordTable {...base} rows={[record]} />);
  expect(html).toContain('Acme &amp; Co');
  expect(html).toContain('Edit Acme &amp; Co');
  expect(html).toContain('Archive Acme &amp; Co');
});
test('operational shell exposes four modules and tenant context', () => {
  const html = renderToStaticMarkup(
    <Workspace
      api={new CrmApi()}
      user={{
        id: 'u',
        firstName: 'Dev',
        lastName: 'User',
        email: 'dev@example.test',
      }}
      organization="tenant-context"
      onDisconnect={async () => {}}
      disconnectBusy={false}
      accessError=""
    />,
  );
  for (const title of [
    'Companies',
    'Contacts',
    'Leads',
    'Opportunities',
    'tenant-context',
    'New company',
    'Search companies',
  ])
    expect(html).toContain(title);
});
