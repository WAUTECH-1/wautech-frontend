import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, DataBoundary } from './presentation';
import { Icon } from './primitives';
import { DashboardView } from './DashboardView';
import { useDashboardTheme } from './theme';
import { TaskList, ActivityFeed } from './widgets';
import { themes, navigation } from './contracts';
import { readPreference, savePreference } from './preferences';
import type {
  DashboardData,
  DashboardActions,
  WorkspaceUser,
  Theme,
  DataState,
  Page,
} from './contracts';
export interface DashboardApplicationProps extends DashboardActions {
  data: DashboardData;
  user: WorkspaceUser;
  state?: DataState;
  errorMessage?: string;
  onRetry?: () => void;
  period: string;
  periods: readonly string[];
  onPeriodChange: (period: string) => void;
  page?: Page;
  renderPage?: (page: Page) => ReactNode;
  onMarkNotificationsRead?: () => void;
  initialTheme?: Theme;
  preferenceKey?: string;
  demoControls?: boolean;
  idPrefix?: string;
  navigationBadges?: Partial<Record<Page, string>>;
  hostControls?: ReactNode;
  onLogout?: () => void;
  logoutBusy?: boolean;
  logoutError?: string;
  renderProfile?: () => ReactNode;
  pageTitle?: string;
  notificationState?: 'loading' | 'ready' | 'unavailable';
}

export function DashboardApplication({
  data,
  user,
  state: providedState = 'ready',
  errorMessage,
  onRetry,
  period,
  periods,
  onPeriodChange,
  page: controlledPage,
  renderPage,
  onNavigate,
  onTaskToggle,
  onMarkNotificationsRead,
  initialTheme = 'Midnight Glass',
  preferenceKey = 'wautech',
  demoControls = false,
  idPrefix,
  navigationBadges,
  hostControls,
  onLogout,
  logoutBusy,
  logoutError,
  renderProfile,
  pageTitle,
  notificationState = 'ready',
}: DashboardApplicationProps) {
  const demo = data.provenance.kind === 'demo';
  const unread =
    data.unreadNotificationCount ??
    data.notifications.filter((n) => !n.read).length;
  const instanceId = useId();
  const mainId =
    idPrefix === undefined ? instanceId + '-main' : idPrefix + 'main';
  const panelId =
    idPrefix === undefined ? instanceId + '-panel' : idPrefix + 'panel-title';
  const { theme, setTheme } = useDashboardTheme(initialTheme, preferenceKey);
  const [collapsed, setCollapsed] = useState(
    () => readPreference(preferenceKey + '-sidebar', 'false') === 'true',
  );
  const [mobile, setMobile] = useState(false);
  const [localPage, setPage] = useState<Page>('Overview');
  const page = controlledPage || localPage;
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<
    'notifications' | 'profile' | 'assistant' | null
  >(null);
  const [previewState, setState] = useState<DataState>('ready');
  const state = demo && demoControls ? previewState : providedState;
  const [prompt, setPrompt] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    savePreference(preferenceKey + '-sidebar', String(collapsed));
  }, [collapsed, preferenceKey]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const close = () => {
      if (!query.matches) setMobile(false);
    };
    query.addEventListener('change', close);
    return () => query.removeEventListener('change', close);
  }, []);
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
      if (!panel && !mobile && (e.ctrlKey || e.metaKey) && e.key === 'k') {
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
  }, [panel, mobile]);
  function navigate(next: Page) {
    if (!controlledPage) setPage(next);
    onNavigate?.(next);
    setMobile(false);
    setQuery('');
    setState('ready');
  }
  const matches = navigation.filter((n) =>
    n.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className={`wautech-dashboard ${collapsed ? 'is-collapsed' : ''}`}
      data-theme={theme}
    >
      <a className="skip-link" href={`#${mainId}`}>
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
        <a
          className="brand"
          href={`#${mainId}`}
          onClick={() => navigate('Overview')}
        >
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
            <strong>{user.workspaceName}</strong>
            <small>Executive workspace</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navigation.slice(0, 8).map((n) => (
            <button
              key={n}
              className={`nav-item ${!pageTitle && page === n ? 'active' : ''}`}
              aria-current={!pageTitle && page === n ? 'page' : undefined}
              title={n}
              onClick={() => navigate(n)}
            >
              <Icon name={n} />
              <span className="nav-copy">{n}</span>
              <>
                {navigationBadges?.[n] && (
                  <span className="nav-count nav-copy">
                    {navigationBadges[n]}
                  </span>
                )}
              </>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="assistant-nav"
            onClick={() => {
              setMobile(false);
              setPanel('assistant');
            }}
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
            <span className="avatar">{user.initials}</span>
            <div className="nav-copy">
              <strong>{user.name}</strong>
              <small>{user.roleLabel}</small>
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
            <strong>{pageTitle || page}</strong>
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
            {hostControls}
            <span className="environment">
              <span /> {demo ? 'Demo workspace' : user.workspaceName}
            </span>
            <button
              className="icon-button notification-button"
              aria-label={
                notificationState === 'ready'
                  ? `Notifications, ${unread} unread ${demo ? 'demo updates' : data.unreadNotificationCount === undefined ? 'loaded updates' : 'updates'}`
                  : `Notifications ${notificationState}`
              }
              onClick={() => setPanel('notifications')}
            >
              <Icon name="bell" />
              {notificationState === 'ready' && unread > 0 && <i />}
            </button>
            <button
              className="avatar profile-button"
              aria-label="Open profile menu"
              onClick={() => setPanel('profile')}
            >
              {user.initials}
            </button>
          </div>
        </header>
        <main id={mainId} tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR BUSINESS, IN FOCUS</p>
              <h1>
                {pageTitle ||
                  (page === 'Overview' ? 'Executive overview' : page)}
              </h1>
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
                onChange={(e) => onPeriodChange(e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <button className="primary" onClick={() => setPanel('assistant')}>
                <Icon name="spark" size={17} /> Ask Intelligence
              </button>
            </div>
          </div>
          <div className="demo-banner">
            <span>
              <span className="demo-dot" />{' '}
              {demo
                ? 'Demonstration data'
                : data.provenance.kind === 'verified'
                  ? 'Verified data'
                  : 'Data unavailable'}{' '}
              <span className="banner-detail">
                {data.provenance.label}
                {data.provenance.kind === 'verified'
                  ? ` · As of ${data.provenance.asOf}`
                  : ''}
              </span>
            </span>
            {demo && demoControls && (
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
            )}
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
            <DataBoundary
              state={state}
              demo={demo}
              errorMessage={errorMessage}
              retry={demo && demoControls ? () => setState('ready') : onRetry}
            >
              {(!demo && renderPage?.(page)) ||
                (page === 'Overview' ? (
                  <DashboardView
                    showProvenance={false}
                    data={data}
                    period={period}
                    onNavigate={navigate}
                    onTaskToggle={onTaskToggle}
                    onOpenNotifications={() => setPanel('notifications')}
                  />
                ) : page === 'Tasks' ? (
                  <Card title="Your task list">
                    <TaskList tasks={data.tasks} onToggle={onTaskToggle} />
                  </Card>
                ) : page === 'Activities' ? (
                  <Card title="Workspace timeline">
                    <ActivityFeed activities={data.activities} />
                  </Card>
                ) : (
                  renderPage?.(page) || (
                    <Card title={page}>
                      <p className="muted">
                        This destination is managed by the host application.
                      </p>
                    </Card>
                  )
                ))}
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
        aria-labelledby={panelId}
      >
        <div className="panel-header">
          <div>
            <p className="eyebrow">WAUTECH INTELLIGENCE</p>
            <h2 id={panelId}>
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
            {renderProfile?.()}
            <div className="profile-detail">
              <span className="avatar">{user.initials}</span>
              <h3>{user.name}</h3>
              <p>
                {user.roleLabel} · {user.workspaceName}
              </p>
              <span className="badge">
                {user.authenticated
                  ? 'Authenticated host profile'
                  : 'Demo profile · no authenticated session'}
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
            {onLogout && (
              <button disabled={logoutBusy} onClick={onLogout}>
                {logoutBusy ? 'Signing out…' : 'Sign out'}
              </button>
            )}
            {logoutError && <p role="alert">{logoutError}</p>}
          </>
        ) : (
          <>
            <p className="muted">
              {notificationState !== 'ready'
                ? `Notifications ${notificationState}. Retry workspace data to refresh.`
                : demo
                  ? 'Sample inbox · changes stay in this session.'
                  : 'Workspace notifications'}
            </p>
            <button
              className="text-button"
              onClick={onMarkNotificationsRead}
              disabled={
                notificationState !== 'ready' ||
                !unread ||
                !onMarkNotificationsRead
              }
            >
              {unread
                ? 'Mark all as read'
                : demo || data.unreadNotificationCount === 0
                  ? 'All marked as read'
                  : 'No unread items in loaded page'}
            </button>
            <div className="inbox">
              {data.notifications.map((n) => (
                <div key={n.id}>
                  <span className={n.read ? 'read-dot' : 'online-dot'} />
                  <div>
                    <strong>{n.title}</strong>
                    <p>{n.detail}</p>
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
