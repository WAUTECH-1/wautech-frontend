import { useCallback, useState } from 'react';
import { useOperations } from './hooks';
import { useLoad, useWorkflowSearch } from '../workflows/hooks';
import { WorkflowFrame, LoadState, Confirmation } from '../workflows/ui';
import { emptyLinks, relationshipFields } from '../workflows/contracts';
import type { Note } from './api';
import { useUnsaved } from '../platform/useUnsaved';
import NoteRecordPicker from './NoteRecordPicker';
export default function NotesPage() {
  const api = useOperations(),
    search = useWorkflowSearch();
  const [revision, setRevision] = useState(0),
    [page, setPage] = useState(0),
    [filter, setFilter] = useState(''),
    [editor, setEditor] = useState<{ record?: Note }>(),
    [pending, setPending] = useState<string>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false);
  useUnsaved(dirty);
  const loader = useCallback(
    (signal: AbortSignal) =>
      api.notes(
        {
          ...Object.fromEntries(
            relationshipFields.flatMap((f) =>
              new URLSearchParams(search).get(f)
                ? [[f, new URLSearchParams(search).get(f)!]]
                : [],
            ),
          ),
          page: String(page),
          search: filter,
        },
        signal,
      ),
    [api, search, page, filter],
  );
  const data = useLoad(
    JSON.stringify([search, page, filter, revision]),
    loader,
  );
  const refresh = () => setRevision((v) => v + 1);
  async function action(work: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await work();
      if (api.active()) {
        setEditor(undefined);
        setDirty(false);
        refresh();
      }
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Note could not be saved.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  const links =
    editor?.record ||
    Object.fromEntries(
      relationshipFields.map((f) => [f, new URLSearchParams(search).get(f)]),
    );
  const field = relationshipFields.find((f) => links[f]) || 'companyId';
  return (
    <WorkflowFrame title="CRM notes" busy={busy} onRefresh={refresh}>
      {error && <p role="alert">{error}</p>}
      {!editor && (
        <>
          <label>
            Search notes
            <input
              type="search"
              maxLength={200}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
            />
          </label>
          {api.canWrite ? (
            <button onClick={() => setEditor({})}>Create note</button>
          ) : (
            <p>Read-only notes access.</p>
          )}
          <LoadState
            error={data.error}
            loading={!data.data && !data.error}
            onRetry={refresh}
          />
          {data.data && (
            <>
              <p>
                {data.data.totalElements} notes · Page {page + 1}
              </p>
              <ul className="workflow-records">
                {data.data.content.map((n) => (
                  <li key={n.id}>
                    <h3>{n.title}</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p>
                    <p>
                      Related{' '}
                      {relationshipFields.find((f) => n[f])?.replace('Id', '')}:{' '}
                      {relationshipFields.map((f) => n[f]).find(Boolean)}
                    </p>
                    {api.canWrite && (
                      <>
                        <button onClick={() => setEditor({ record: n })}>
                          Edit {n.title}
                        </button>
                        <button onClick={() => setPending(n.id)}>
                          Archive {n.title}
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {!data.data.content.length && <p>No notes match this view.</p>}
              <button
                disabled={page === 0}
                onClick={() => setPage((v) => v - 1)}
              >
                Previous notes
              </button>
              <button
                disabled={page + 1 >= data.data.totalPages}
                onClick={() => setPage((v) => v + 1)}
              >
                Next notes
              </button>
            </>
          )}
        </>
      )}
      {editor && (
        <form
          className="workflow-form"
          onInput={() => setDirty(true)}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action(() =>
              api.saveNote(
                {
                  ...emptyLinks(),
                  [String(f.get('relation'))]: String(f.get('recordId')),
                  title: String(f.get('title')),
                  body: String(f.get('body')),
                } as Omit<Note, 'id'>,
                editor.record?.id,
              ),
            );
          }}
        >
          <fieldset disabled={busy}>
            <h3>{editor.record ? 'Edit' : 'Create'} note</h3>
            <label>
              Note title
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={editor.record?.title}
              />
            </label>
            <label>
              Note body
              <textarea
                name="body"
                required
                maxLength={10000}
                rows={8}
                defaultValue={editor.record?.body}
              />
            </label>
            <NoteRecordPicker
              api={api}
              initialField={field}
              initialId={String(links[field] || '')}
            />
            <p>The server verifies the related record in this organization.</p>
            <button type="submit">Save note</button>
            <button
              type="button"
              onClick={() => {
                if (!dirty || window.confirm('Discard unsaved note?')) {
                  setEditor(undefined);
                  setDirty(false);
                }
              }}
            >
              Cancel note editing
            </button>
          </fieldset>
        </form>
      )}
      {pending && (
        <Confirmation
          message="Archive this note?"
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            const id = pending;
            setPending(undefined);
            void action(() => api.archiveNote(id));
          }}
        />
      )}
    </WorkflowFrame>
  );
}
