import { useCallback, useState } from 'react';
import { useLoad, useWorkflowApi } from './hooks';
import { WorkflowFrame, LoadState, Confirmation } from './ui';
import { navigate } from '../../routing/history';
export default function NotificationPage() {
  const api = useWorkflowApi();
  const [page, setPage] = useState(0),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [unreadOnly, setUnreadOnly] = useState(false),
    [confirm, setConfirm] = useState(false);
  const loader = useCallback(
    async (signal: AbortSignal) => {
      const [list, count] = await Promise.all([
        api.notifications(page, signal),
        api.unread(signal),
      ]);
      return { list, count };
    },
    [api, page],
  );
  const state = useLoad(`${page}:${revision}`, loader);
  const refresh = () => setRevision((v) => v + 1);
  async function action(run: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await run();
      if (api.active()) {
        setNotice(message);
        refresh();
      }
    } catch (e) {
      if (api.active())
        setError(
          e instanceof Error ? e.message : 'Notification action failed.',
        );
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  const content = state.data?.list.content.filter(
    (row) => !unreadOnly || !row.readAt,
  );
  return (
    <WorkflowFrame title="Notifications" busy={busy} onRefresh={refresh}>
      <button
        disabled={busy}
        onClick={() =>
          void action(
            () => api.checkReminders(),
            'Due-task reminders checked. Refresh shows confirmed notifications.',
          )
        }
      >
        Check my due task reminders
      </button>
      <p>
        Notifications are loaded on demand. Refresh to see new events. Due
        checks generate reminders for your assigned pending tasks. Real-time
        streaming is unavailable.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <LoadState
        error={state.error}
        loading={!state.data && !state.error}
        onRetry={refresh}
      />
      {state.data && (
        <>
          <p role="status">{state.data.count} unread notifications</p>
          <label className="workflow-checkbox">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            Show unread on this page
          </label>
          <button
            disabled={busy || state.data.count === 0}
            onClick={() => setConfirm(true)}
          >
            Mark all as read
          </button>
          {content?.length ? (
            <ul className="workflow-records">
              {content.map((row) => (
                <li key={row.id}>
                  <h3>{row.title}</h3>
                  <p>{row.message}</p>
                  <p>
                    {row.readAt ? 'Read' : 'Unread'} ·{' '}
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                  {!row.readAt && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void action(
                          () => api.markRead(row.id),
                          'Notification marked read.',
                        )
                      }
                    >
                      Mark as read
                    </button>
                  )}
                  {row.readAt && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void action(
                          () => api.markUnread(row.id),
                          'Notification marked unread.',
                        )
                      }
                    >
                      Mark as unread
                    </button>
                  )}
                  {row.targetType === 'ORGANIZATION_MEMBERSHIP' &&
                  row.targetId ? (
                    <>
                      <p>Related organization membership: {row.targetId}</p>
                      {['OWNER', 'ADMIN'].includes(String(api.role)) ? (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              const path = await api.membershipTarget(
                                row.targetId!,
                              );
                              if (api.active()) navigate(path);
                            }, 'Target access verified.')
                          }
                        >
                          Open membership administration
                        </button>
                      ) : (
                        <p>
                          Membership target access requires ADMIN or OWNER.
                          Contact an administrator.
                        </p>
                      )}
                    </>
                  ) : row.targetId &&
                    ['TASK', 'OPPORTUNITY'].includes(row.targetType) ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          const path = await api.notificationTarget(
                            row.targetType,
                            row.targetId!,
                          );
                          if (api.active()) navigate(path);
                        }, 'Target access verified.')
                      }
                    >
                      Open related {row.targetType.toLowerCase()}
                    </button>
                  ) : (
                    <p>
                      Related record navigation is unavailable for this
                      notification type.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No notifications match on this page.</p>
          )}
          <p>
            Page {page + 1} of {Math.max(1, state.data.list.totalPages)} ·{' '}
            {state.data.list.totalElements} notifications
          </p>
          <div className="workflow-actions">
            <button
              disabled={busy || state.data.list.first}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous notifications
            </button>
            <button
              disabled={busy || state.data.list.last}
              onClick={() => setPage((value) => value + 1)}
            >
              Next notifications
            </button>
          </div>
        </>
      )}
      {confirm && (
        <Confirmation
          message="Mark all of your notifications in the current organization as read?"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            void action(
              () => api.markAllRead(),
              'All notifications marked read.',
            );
          }}
        />
      )}
    </WorkflowFrame>
  );
}
