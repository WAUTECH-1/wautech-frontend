import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { CrmOperations, ListQuery } from './api';
import {
  leadStatuses,
  leadTransitions,
  opportunityStages,
  stageTransitions,
} from './contracts';
import type {
  Company,
  Contact,
  Lead,
  Opportunity,
  RecordDto,
  Resource,
  User,
} from './contracts';
import { paginate } from './forms';
import { RecordTable } from './RecordTable';
import { RecordForm } from './RecordForm';
import { Dialog } from './Dialog';
const resources: Resource[] = [
  'companies',
  'contacts',
  'leads',
  'opportunities',
];
const titles: Record<Resource, string> = {
  companies: 'Companies',
  contacts: 'Contacts',
  leads: 'Leads',
  opportunities: 'Opportunities',
};
const singular: Record<Resource, string> = {
  companies: 'company',
  contacts: 'contact',
  leads: 'lead',
  opportunities: 'opportunity',
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please retry.';
const name = (r: RecordDto) =>
  'name' in r ? r.name : `${r.firstName} ${r.lastName}`;
export function Workspace({
  api,
  user,
  organization,
  onDisconnect,
  disconnectBusy,
  accessError,
  controlledResource,
  contentOnly = false,
  readOnly = false,
  renderRecordActions,
}: {
  api: CrmOperations;
  user: User;
  organization: string;
  onDisconnect: () => Promise<void>;
  disconnectBusy: boolean;
  accessError: string;
  controlledResource?: Resource;
  contentOnly?: boolean;
  readOnly?: boolean;
  renderRecordActions?: (record: RecordDto) => ReactNode;
}) {
  const [localResource, setResource] = useState<Resource>('companies');
  const resource = controlledResource || localResource;
  const Content = contentOnly ? 'div' : 'main';
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [companyFilter, setCompanyFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [rows, setRows] = useState<RecordDto[]>([]);
  const [serverTotal, setServerTotal] = useState<number>();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<RecordDto | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editor, setEditor] = useState<{ record: RecordDto | null } | null>(
    null,
  );
  const [archive, setArchive] = useState<RecordDto | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setRows([]);
      setError('');
      const query: ListQuery = { search, sortBy, sortDirection: direction };
      if (resource !== 'companies' && companyFilter)
        query.companyId = companyFilter;
      if (resource === 'opportunities' && contactFilter)
        query.contactId = contactFilter;
      if (resource === 'leads' && stateFilter)
        query.status = stateFilter as Lead['status'];
      if ((resource === 'companies' || resource === 'contacts') && stateFilter)
        query.status = stateFilter;
      if (resource === 'opportunities' && stateFilter)
        query.stage = stateFilter as Opportunity['stage'];
      Promise.all([
        api.listPage
          ? api.listPage(resource, query, page - 1, size, controller.signal)
          : api.list(resource, query, controller.signal),
        api.list('companies', {}, controller.signal),
        api.list('contacts', {}, controller.signal),
      ])
        .then(([records, companyRows, contactRows]) => {
          if (!controller.signal.aborted) {
            if (Array.isArray(records)) {
              setRows(records);
              setServerTotal(undefined);
            } else {
              setRows(records.content);
              setServerTotal(records.totalElements);
            }
            setCompanies(companyRows);
            setContacts(contactRows);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(message(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    api,
    resource,
    search,
    sortBy,
    direction,
    companyFilter,
    contactFilter,
    stateFilter,
    revision,
    page,
    size,
  ]);
  useEffect(() => {
    if (!detailId) return;
    const controller = new AbortController();
    api
      .get(resource, detailId, controller.signal)
      .then((r) => {
        if (!controller.signal.aborted) setSelected(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [api, resource, detailId]);
  function navigate(next: Resource) {
    setResource(next);
    setSearch('');
    setSortBy('createdAt');
    setDirection('desc');
    setCompanyFilter('');
    setContactFilter('');
    setStateFilter('');
    setPage(1);
    setRows([]);
    setLoading(true);
    setSelected(null);
    setDetailId(null);
    setDetailLoading(false);
    setEditor(null);
    setArchive(null);
    setError('');
    setNotice('');
  }
  function reload() {
    setRows([]);
    setLoading(true);
    setRevision((v) => v + 1);
  }
  function changed(text: string) {
    setNotice(text);
    reload();
    setSelected(null);
    setDetailId(null);
    setPage(1);
  }
  async function archiveRecord() {
    if (!archive) return;
    setBusy(true);
    setError('');
    try {
      await api.archive(resource, archive.id);
      setArchive(null);
      changed('Record archived successfully.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function transition(value: string) {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      if (resource === 'leads')
        await api.changeLeadStatus(selected.id, value as Lead['status']);
      else
        await api.changeOpportunityStage(
          selected.id,
          value as Opportunity['stage'],
        );
      changed('State updated successfully.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const result =
    serverTotal === undefined
      ? paginate(rows, page, size)
      : {
          items: rows,
          page,
          pages: Math.max(1, Math.ceil(serverTotal / size)),
          total: serverTotal,
        };
  const transitions =
    selected && resource === 'leads'
      ? leadTransitions[(selected as Lead).status]
      : selected && resource === 'opportunities'
        ? stageTransitions[(selected as Opportunity).stage]
        : [];
  return (
    <div className={contentOnly ? 'wautech-crm' : 'shell'}>
      {!contentOnly && (
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">W</span>
            <div>
              WAUTECH<small>INTELLIGENCE</small>
            </div>
          </div>
          <p className="eyebrow">WORKSPACE</p>
          <p className="workspace-label">
            CRM Operations <span className="dot" />
          </p>
          <nav aria-label="CRM navigation">
            {resources.map((key, index) => (
              <button
                key={key}
                disabled={busy}
                className={resource === key ? 'nav-link active' : 'nav-link'}
                onClick={() => navigate(key)}
              >
                <span>{['▦', '◎', '↗', '◇'][index]}</span>
                {titles[key]}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="avatar">
              {user.firstName?.slice(0, 1)}
              {user.lastName?.slice(0, 1)}
            </span>
            <div>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <small>{user.email}</small>
            </div>
            <button
              disabled={disconnectBusy || busy}
              onClick={() => void onDisconnect()}
              aria-label="Sign out"
            >
              ↪
            </button>
          </div>
        </aside>
      )}
      <Content className="content">
        {!contentOnly && (
          <header className="topbar">
            <span>
              Workspace <span className="muted"> / </span> CRM Operations{' '}
              <span className="muted"> / </span> {titles[resource]}
            </span>
            <span className="connection">
              <span className="dot" /> Backend session
            </span>
          </header>
        )}
        <section className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">RELATIONSHIP MANAGEMENT</p>
              <h1>{titles[resource]}</h1>
              <p className="muted">
                {resource === 'companies'
                  ? 'Keep every business relationship in view.'
                  : resource === 'contacts'
                    ? 'The people behind your business relationships.'
                    : resource === 'leads'
                      ? 'Turn first conversations into qualified relationships.'
                      : 'Manage value and move deals through your pipeline.'}
              </p>
            </div>
            <button
              className="primary"
              disabled={loading || busy || readOnly}
              onClick={() => {
                setError('');
                setEditor({ record: null });
              }}
            >
              ＋ New {singular[resource]}
            </button>
          </div>
          <div className="context-strip">
            <span>
              Active organization <code>{organization}</code>
            </span>
            <span>Active records only</span>
          </div>
          {(error || accessError) && (
            <div role="alert" className="error banner">
              {error || accessError}
              <button onClick={reload}>Retry loading</button>
            </div>
          )}
          {notice && (
            <div role="status" className="success banner">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                ×
              </button>
            </div>
          )}
          <section className="data-card">
            <div className="table-toolbar">
              <label className="search">
                <span>⌕</span>
                <input
                  aria-label={`Search ${titles[resource].toLowerCase()}`}
                  placeholder={`Search ${titles[resource].toLowerCase()}…`}
                  maxLength={200}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    setRows([]);
                    setLoading(true);
                  }}
                />
              </label>
              {resource !== 'companies' && (
                <select
                  aria-label="Filter by company"
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value);
                    setContactFilter('');
                    setPage(1);
                    setRows([]);
                    setLoading(true);
                  }}
                >
                  <option value="">All companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {resource === 'opportunities' && (
                <select
                  aria-label="Filter by contact"
                  value={contactFilter}
                  onChange={(e) => {
                    setContactFilter(e.target.value);
                    setPage(1);
                    setRows([]);
                    setLoading(true);
                  }}
                >
                  <option value="">All contacts</option>
                  {contacts
                    .filter(
                      (c) => !companyFilter || c.companyId === companyFilter,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                </select>
              )}
              {(resource === 'leads' || resource === 'opportunities') && (
                <select
                  aria-label="Filter by state"
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setPage(1);
                    setRows([]);
                    setLoading(true);
                  }}
                >
                  <option value="">
                    All {resource === 'leads' ? 'statuses' : 'stages'}
                  </option>
                  {(resource === 'leads'
                    ? leadStatuses
                    : opportunityStages
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
              {(resource === 'companies' || resource === 'contacts') && (
                <label>
                  Status filter
                  <input
                    aria-label="Status filter"
                    maxLength={40}
                    placeholder="Any status"
                    value={stateFilter}
                    onChange={(e) => {
                      setStateFilter(e.target.value);
                      setPage(1);
                      setRows([]);
                      setLoading(true);
                    }}
                  />
                </label>
              )}
              <select
                aria-label="Sort field"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                  setRows([]);
                  setLoading(true);
                }}
              >
                <option value="createdAt">Created date</option>
                <option value="updatedAt">Updated date</option>
                <option
                  value={
                    resource === 'companies' || resource === 'opportunities'
                      ? 'name'
                      : 'lastName'
                  }
                >
                  Name
                </option>
              </select>
              <button
                aria-label="Toggle sort direction"
                onClick={() => {
                  setDirection((v) => (v === 'asc' ? 'desc' : 'asc'));
                  setPage(1);
                  setRows([]);
                  setLoading(true);
                }}
              >
                {direction === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
              <button aria-label="Refresh records" onClick={reload}>
                ↻
              </button>
            </div>
            <RecordTable
              readOnly={readOnly}
              resource={resource}
              rows={result.items}
              companies={companies}
              loading={loading}
              error={!!error}
              onOpen={(r) => {
                setError('');
                setSelected(null);
                setDetailLoading(true);
                setDetailId(r.id);
              }}
              onEdit={(r) => {
                setError('');
                setEditor({ record: r });
              }}
              onArchive={(r) => {
                setError('');
                setArchive(r);
              }}
            />
            <footer className="pagination">
              <span>
                {loading
                  ? 'Loading records…'
                  : `${result.total} records · Page ${result.page} of ${result.pages}`}
                <small>
                  {api.listPage
                    ? 'Records are paginated by the server.'
                    : 'Pagination is local to the returned backend list.'}
                </small>
              </span>
              <div>
                <select
                  aria-label="Rows per page"
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
                <button
                  disabled={loading || result.page === 1}
                  onClick={() => setPage(result.page - 1)}
                >
                  Previous
                </button>
                <button
                  disabled={loading || result.page === result.pages}
                  onClick={() => setPage(result.page + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
          <p className="page-note">
            WAUTECH Intelligence <span>CRM Operations · Umer</span>
          </p>
        </section>
      </Content>
      {(selected || detailLoading) && (
        <Dialog
          titleId="detail-title"
          busy={busy}
          onClose={() => {
            setSelected(null);
            setDetailId(null);
            setDetailLoading(false);
          }}
        >
          <button
            className="close"
            disabled={busy}
            aria-label="Close details"
            onClick={() => {
              setSelected(null);
              setDetailId(null);
              setDetailLoading(false);
            }}
          >
            ×
          </button>
          <p className="eyebrow">{singular[resource]} DETAILS</p>
          <h2 id="detail-title">
            {selected ? name(selected) : 'Loading record…'}
          </h2>
          {selected && (
            <>
              <dl>
                {Object.entries(selected).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replace(/([A-Z])/g, ' $1')}</dt>
                    <dd>{value === null ? '—' : String(value)}</dd>
                  </div>
                ))}
              </dl>
              {renderRecordActions?.(selected)}
              {transitions.length > 0 && (
                <label>
                  Move to
                  <select
                    disabled={busy || readOnly}
                    value=""
                    onChange={(e) => void transition(e.target.value)}
                  >
                    <option value="">
                      Select next {resource === 'leads' ? 'status' : 'stage'}
                    </option>
                    {transitions.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              )}
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button
                disabled={busy || readOnly}
                className="primary"
                onClick={() => {
                  setEditor({ record: selected });
                  setSelected(null);
                  setDetailId(null);
                }}
              >
                Edit {singular[resource]}
              </button>
            </>
          )}
        </Dialog>
      )}
      {editor && (
        <RecordForm
          key={`${resource}-${editor.record?.id || 'new'}`}
          api={api}
          resource={resource}
          record={editor.record}
          companies={companies}
          contacts={contacts}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            changed('Record saved successfully.');
          }}
        />
      )}
      {archive && (
        <Dialog
          titleId="archive-title"
          busy={busy}
          compact
          onClose={() => setArchive(null)}
        >
          <h2 id="archive-title">Archive {name(archive)}?</h2>
          <p>
            This record will be removed from active lists. Related records are
            governed by the backend’s association rules.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button disabled={busy} onClick={() => setArchive(null)}>
              Cancel
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => void archiveRecord()}
            >
              {busy ? 'Archiving…' : 'Archive record'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
