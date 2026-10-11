import { useEffect, useRef, useState } from 'react';
import { Card, DataBoundary, Icon, PerformanceChart } from './components';
import {
  deals,
  money,
  navigation,
  notifications,
  readPreference,
  savePreference,
  tasks,
  themes,
} from './data';
import type { DataState, Page, Theme } from './data';

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () =>
      themes.find((t) => t === readPreference('wautech-theme', themes[0])) ||
      themes[0],
  );
  const [collapsed, setCollapsed] = useState(
    () => readPreference('wautech-sidebar', 'false') === 'true',
  );
  const [mobile, setMobile] = useState(false);
  const [page, setPage] = useState<Page>('Overview');
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<
    'notifications' | 'profile' | 'assistant' | null
  >(null);
  const [state, setState] = useState<DataState>('ready');
  const [period, setPeriod] = useState('This quarter');
  const [completed, setCompleted] = useState<string[]>([]);
  const [read, setRead] = useState(false);
  const [prompt, setPrompt] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    savePreference('wautech-theme', theme);
  }, [theme]);
  useEffect(() => {
    savePreference('wautech-sidebar', String(collapsed));
  }, [collapsed]);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement;
    sidebarRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements =
        sidebarRef.current?.querySelectorAll<HTMLElement>('a,button');
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previous.focus();
    };
  }, [mobile]);
  useEffect(() => {
    if (panel) {
      lastFocus.current = document.activeElement as HTMLElement;
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      lastFocus.current?.focus();
    }
  }, [panel]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setQuery('');
        setMobile(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  function navigate(next: Page) {
    setPage(next);
    setMobile(false);
    setQuery('');
    setState('ready');
  }
  function toggleTask(task: string) {
    setCompleted((c) =>
      c.includes(task) ? c.filter((t) => t !== task) : [...c, task],
    );
  }
  const matches = navigation.filter((n) =>
    n.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className={`app ${collapsed ? 'is-collapsed' : ''}`}
      data-theme={theme}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${mobile ? 'mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        <a className="brand" href="#main" onClick={() => navigate('Overview')}>
          <span className="brand-mark">
            W<span>•</span>
          </span>
          <span className="brand-copy">
            WAUTECH<small>INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">W</span>
          <div className="nav-copy">
            <strong>WAUTECH LTD</strong>
            <small>Executive workspace</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navigation.slice(0, 8).map((n) => (
            <button
              key={n}
              className={`nav-item ${page === n ? 'active' : ''}`}
              aria-current={page === n ? 'page' : undefined}
              title={n}
              onClick={() => navigate(n)}
            >
              <Icon name={n} />
              <span className="nav-copy">{n}</span>
              {n === 'Leads' && <span className="nav-count nav-copy">24</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="assistant-nav"
            onClick={() => setPanel('assistant')}
            title="Intelligence assistant"
          >
            <Icon name="spark" />
            <span className="nav-copy">
              Intelligence assistant <small>PREVIEW</small>
            </span>
          </button>
          <button
            className="nav-item"
            onClick={() => navigate('Settings')}
            title="Settings"
          >
            <Icon name="Settings" />
            <span className="nav-copy">Settings</span>
          </button>
          <button
            className="nav-item"
            onClick={() =>
              mobile ? setMobile(false) : setCollapsed(!collapsed)
            }
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            <Icon name="menu" />
            <span className="nav-copy">Collapse sidebar</span>
          </button>
          <div className="sidebar-profile">
            <span className="avatar">AS</span>
            <div className="nav-copy">
              <strong>Asad</strong>
              <small>Workspace developer</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={mobile}>
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Open navigation"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            Workspace <Icon name="chevron" size={14} />
            <strong>{page}</strong>
          </div>
          <div className="search-wrap">
            <Icon name="search" size={18} />
            <input
              ref={searchRef}
              aria-label="Search navigation"
              placeholder="Search workspace…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>Ctrl K</kbd>
            {query && (
              <div className="search-results" aria-label="Navigation results">
                {matches.length ? (
                  matches.map((n) => (
                    <button key={n} onClick={() => navigate(n)}>
                      <Icon name={n} />
                      {n}
                    </button>
                  ))
                ) : (
                  <p>No matching pages</p>
                )}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <span className="environment">
              <span /> Demo workspace
            </span>
            <button
              className="icon-button notification-button"
              aria-label={`Notifications, ${read ? 0 : 3} unread demo updates`}
              onClick={() => setPanel('notifications')}
            >
              <Icon name="bell" />
              {!read && <i />}
            </button>
            <button
              className="avatar profile-button"
              aria-label="Open profile menu"
              onClick={() => setPanel('profile')}
            >
              AS
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR BUSINESS, IN FOCUS</p>
              <h1>{page === 'Overview' ? 'Executive overview' : page}</h1>
              <p className="intro">
                {page === 'Overview'
                  ? 'A clearer perspective. A smarter next move.'
                  : `Explore your ${page.toLowerCase()} in one place.`}
              </p>
            </div>
            <div className="heading-actions">
              <select
                aria-label="Reporting period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option>This quarter</option>
                <option>Last quarter</option>
              </select>
              <button className="primary" onClick={() => setPanel('assistant')}>
                <Icon name="spark" size={17} /> Ask Intelligence
              </button>
            </div>
          </div>
          <div className="demo-banner">
            <span>
              <span className="demo-dot" /> Demonstration data{' '}
              <span className="banner-detail">
                · Sample records and metrics. Backend is not connected.
              </span>
            </span>
            <label>
              Preview state{' '}
              <select
                aria-label="Preview data state"
                value={state}
                onChange={(e) => setState(e.target.value as DataState)}
              >
                <option value="ready">Ready</option>
                <option value="loading">Loading</option>
                <option value="empty">Empty</option>
                <option value="error">Error</option>
              </select>
            </label>
          </div>
          {page === 'Settings' ? (
            <Card
              title="Make it yours"
              subtitle="Choose the atmosphere for your workspace."
            >
              <div className="theme-grid">
                {themes.map((t, i) => (
                  <button
                    key={t}
                    className={`theme-choice theme-${i}`}
                    onClick={() => setTheme(t)}
                    aria-pressed={t === theme}
                  >
                    <span className="theme-preview">
                      <i />
                      <i />
                      <i />
                    </span>
                    <strong>{t}</strong>
                    <small>
                      {t === theme ? 'Active theme' : 'Select theme'}
                    </small>
                  </button>
                ))}
              </div>
              <p className="muted">
                Preferences are saved on this browser. System reduced-motion
                preferences are respected.
              </p>
            </Card>
          ) : (
            <DataBoundary state={state} retry={() => setState('ready')}>
              {page === 'Overview' ? (
                <>
                  <div className="metrics">
                    {[
                      {
                        label: 'Opportunity value',
                        value: '$230,000',
                        change: '+18.6%',
                        icon: 'Opportunities',
                        detail: 'Across 4 sample opportunities',
                      },
                      {
                        label: 'Active companies',
                        value: '128',
                        change: '+12.3%',
                        icon: 'Companies',
                        detail: '386 sample contacts',
                      },
                      {
                        label: 'Open leads',
                        value: '24',
                        change: '+8.2%',
                        icon: 'Leads',
                        detail: '16 qualified · 8 new',
                      },
                      {
                        label: 'Win rate',
                        value: '68.4%',
                        change: '+4.8 pts',
                        icon: 'up',
                        detail: 'Illustrative performance',
                      },
                    ].map((m, i) => (
                      <section className="card metric" key={m.label}>
                        <div className="metric-top">
                          <span>{m.label}</span>
                          <span className={`metric-icon tone-${i}`}>
                            <Icon name={m.icon} />
                          </span>
                        </div>
                        <div className="metric-value">
                          {m.value}
                          <svg
                            className="sparkline"
                            viewBox="0 0 90 30"
                            aria-hidden="true"
                          >
                            <path d="M2 27L13 20 23 24 34 13 46 17 57 8 69 12 80 3 88 5" />
                          </svg>
                        </div>
                        <div className="metric-foot">
                          <span className="positive">↗ {m.change}</span>
                          <span>vs. previous period</span>
                        </div>
                        <small>{m.detail}</small>
                      </section>
                    ))}
                  </div>
                  <div className="dashboard-grid">
                    <Card
                      title="Opportunity performance"
                      subtitle="Value in USD · illustrative, not booked revenue"
                      className="performance"
                      action={<span className="badge">{period}</span>}
                    >
                      <div className="chart-summary">
                        <strong>$230,000</strong>
                        <span className="positive">↗ 18.6%</span>
                        <div className="legend">
                          <span>
                            <i />
                            Current period
                          </span>
                          <span>
                            <i />
                            Previous period
                          </span>
                        </div>
                      </div>
                      <PerformanceChart period={period} />
                    </Card>
                    <Card
                      title="Sales pipeline"
                      subtitle="Where the next opportunity lives"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate('Sales pipeline')}
                          aria-label="View sales pipeline"
                        >
                          <Icon name="arrow" />
                        </button>
                      }
                    >
                      <div className="pipeline-total">
                        <strong>$230k</strong>
                        <span>4 open opportunities</span>
                      </div>
                      <div className="pipeline-segments">
                        {deals.map((d, i) => (
                          <span
                            key={d.stage}
                            className={`segment-${i}`}
                            style={{ flex: d.value }}
                          />
                        ))}
                      </div>
                      <div className="pipeline-list">
                        {deals.map((d, i) => (
                          <button
                            key={d.stage}
                            onClick={() => navigate('Sales pipeline')}
                          >
                            <span className={`stage-dot segment-${i}`} />
                            <span>{d.stage}</span>
                            <small>1 deal</small>
                            <strong>{money(d.value)}</strong>
                          </button>
                        ))}
                      </div>
                    </Card>
                    <Card
                      title="Priority actions"
                      subtitle="Small steps. Meaningful progress."
                      className="priority-card"
                      action={<span className="badge">2 to review</span>}
                    >
                      {[
                        'Move your next deal forward',
                        'Reconnect with a promising lead',
                      ].map((t, i) => (
                        <div className="priority-item" key={t}>
                          <span className="priority-symbol">
                            <Icon name={i ? 'Contacts' : 'Opportunities'} />
                          </span>
                          <div>
                            <strong>{t}</strong>
                            <p>
                              {i
                                ? 'Schedule the next conversation with Orbit Systems.'
                                : 'Northstar Labs is waiting on a proposal review.'}
                            </p>
                          </div>
                          <button
                            className="text-button"
                            onClick={() =>
                              navigate(i ? 'Leads' : 'Opportunities')
                            }
                          >
                            Review <Icon name="arrow" size={16} />
                          </button>
                        </div>
                      ))}
                    </Card>
                    <Card
                      title="Upcoming tasks"
                      subtitle={`${tasks.length - completed.length} remaining · local demo`}
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate('Tasks')}
                        >
                          View all <Icon name="arrow" size={16} />
                        </button>
                      }
                    >
                      <TaskList completed={completed} toggle={toggleTask} />
                    </Card>
                    <Card
                      title="Recent opportunities"
                      subtitle="Your most promising conversations"
                      className="opportunities-card"
                      action={
                        <button
                          className="text-button"
                          onClick={() => navigate('Opportunities')}
                        >
                          View all <Icon name="arrow" size={16} />
                        </button>
                      }
                    >
                      <DealTable />
                    </Card>
                    <Card
                      title="Activity feed"
                      subtitle="The latest across your workspace"
                    >
                      <div className="activity-list">
                        {[
                          'Sarah updated the Northstar proposal',
                          'James added a contact at Orbit Systems',
                          'Asad qualified the Meridian opportunity',
                        ].map((a, i) => (
                          <div key={a}>
                            <span className={`activity-dot tone-${i}`} />
                            <div>
                              <p>{a}</p>
                              <small>
                                {[15, 42, 58][i]} minutes ago · sample
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate('Activities')}
                      >
                        Explore activities <Icon name="arrow" size={16} />
                      </button>
                    </Card>
                    <Card
                      title="Notifications summary"
                      subtitle="Your attention, thoughtfully directed"
                      className="notification-summary"
                    >
                      <div>
                        <strong>
                          {read
                            ? 'You’re all caught up'
                            : '3 updates to review'}
                        </strong>
                        <p>Demonstration notifications for this workspace.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setPanel('notifications')}
                      >
                        Open inbox <Icon name="arrow" size={16} />
                      </button>
                    </Card>
                  </div>
                </>
              ) : page === 'Tasks' ? (
                <Card
                  title="Your task list"
                  subtitle="Changes stay in this demo session."
                >
                  <TaskList completed={completed} toggle={toggleTask} />
                </Card>
              ) : page === 'Activities' ? (
                <Card
                  title="Workspace timeline"
                  subtitle="Demonstration activity records"
                >
                  <div className="activity-list">
                    {notifications.map((n) => (
                      <div key={n}>
                        <Icon name="Activities" />
                        <p>{n}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card
                  title={
                    page === 'Sales pipeline'
                      ? 'Opportunity stages'
                      : `${page} directory`
                  }
                  subtitle="Fictional demonstration records."
                >
                  <DealTable mode={page} />
                </Card>
              )}
            </DataBoundary>
          )}
          <footer>
            <span>
              WAUTECH Intelligence · Clarity that moves business forward.
            </span>
            <label>
              Appearance{' '}
              <select
                aria-label="Theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
              >
                {themes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        className="panel"
        onCancel={() => setPanel(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPanel(null);
        }}
        aria-labelledby="panel-title"
      >
        <div className="panel-header">
          <div>
            <p className="eyebrow">WAUTECH INTELLIGENCE</p>
            <h2 id="panel-title">
              {panel === 'assistant'
                ? 'Your thinking partner'
                : panel === 'profile'
                  ? 'Workspace profile'
                  : 'Notifications'}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close panel"
            onClick={() => setPanel(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        {panel === 'assistant' ? (
          <>
            <div className="assistant-orb">
              <Icon name="spark" size={38} />
            </div>
            <h3>A little clarity goes a long way.</h3>
            <p className="muted">
              AI service is not connected. This panel previews the conversation
              experience; it does not generate responses.
            </p>
            <div className="suggested-prompts">
              {[
                'Summarize my sales pipeline',
                'What needs my attention today?',
                'Help me prepare for a client meeting',
              ].map((p) => (
                <button key={p} onClick={() => setPrompt(p)}>
                  {p}
                  <Icon name="arrow" size={16} />
                </button>
              ))}
            </div>
            {prompt && (
              <div className="conversation">
                <p className="user-message">{prompt}</p>
                <p className="service-message">
                  Service not connected. Your prompt has not been sent.
                </p>
              </div>
            )}
            <label className="prompt-label">
              Draft your prompt
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What would you like to explore?"
              />
            </label>
            <button className="primary" disabled>
              AI service not connected
            </button>
          </>
        ) : panel === 'profile' ? (
          <>
            <div className="profile-detail">
              <span className="avatar">AS</span>
              <h3>Asad</h3>
              <p>Developer · WAUTECH LTD</p>
              <span className="badge">
                Demo profile · no authenticated session
              </span>
            </div>
            <button
              className="primary"
              onClick={() => {
                navigate('Settings');
                setPanel(null);
              }}
            >
              Appearance settings
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Sample inbox · changes stay in this session.
            </p>
            <button
              className="text-button"
              onClick={() => setRead(true)}
              disabled={read}
            >
              {read ? 'All marked as read' : 'Mark all as read'}
            </button>
            <div className="inbox">
              {notifications.map((n) => (
                <div key={n}>
                  <span className={read ? 'read-dot' : 'online-dot'} />
                  <div>
                    <strong>{n}</strong>
                    <p>Demonstration update</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
function TaskList({
  completed,
  toggle,
}: {
  completed: string[];
  toggle: (task: string) => void;
}) {
  return (
    <div className="task-list">
      {tasks.map((task, i) => (
        <label key={task} className={completed.includes(task) ? 'done' : ''}>
          <input
            type="checkbox"
            checked={completed.includes(task)}
            onChange={() => toggle(task)}
          />
          <span>
            <strong>{task}</strong>
            <small>
              {i === 0 ? 'Today · High priority' : 'This week · Follow-up'}
            </small>
          </span>
          <span className="task-avatar">{['SC', 'JM', 'AS'][i]}</span>
        </label>
      ))}
    </div>
  );
}
function DealTable({ mode = 'Opportunities' }: { mode?: Page }) {
  const directory =
    mode === 'Companies' || mode === 'Contacts' || mode === 'Leads';
  const contacts = [
    'Elena Brooks',
    'Daniel Reed',
    'Maya Patel',
    'Oliver Grant',
  ];
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">
          Fictional {mode.toLowerCase()} records
        </caption>
        <thead>
          <tr>
            <th>{mode === 'Contacts' ? 'Contact' : 'Company'}</th>
            <th>
              {mode === 'Contacts'
                ? 'Company'
                : mode === 'Companies'
                  ? 'Industry'
                  : 'Opportunity'}
            </th>
            <th>{directory ? 'Status' : 'Stage'}</th>
            <th>{directory ? 'Next step' : 'Value (USD)'}</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((d, i) => (
            <tr key={d.company}>
              <td>
                <span className="company-cell">
                  <span className="company-avatar">{d.initials}</span>
                  <strong>
                    {mode === 'Contacts' ? contacts[i] : d.company}
                  </strong>
                </span>
              </td>
              <td>
                {mode === 'Contacts'
                  ? d.company
                  : mode === 'Companies'
                    ? [
                        'Technology',
                        'Software',
                        'Consulting',
                        'Digital services',
                      ][i]
                    : d.name}
              </td>
              <td>
                <span className={`stage-badge ${d.stage.toLowerCase()}`}>
                  {directory
                    ? mode === 'Leads'
                      ? i < 2
                        ? 'Qualified'
                        : 'New'
                      : 'Active'
                    : d.stage}
                </span>
              </td>
              <td className="table-value">
                {directory
                  ? [
                      'Proposal review',
                      'Discovery call',
                      'Requirements review',
                      'Initial outreach',
                    ][i]
                  : money(d.value)}
              </td>
              <td>{d.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
