import { useState } from 'react';
import { useOperations } from './hooks';
import { WorkflowFrame, Confirmation } from '../workflows/ui';
const templates = {
  companies: 'name,website,industry,phone,email,status',
  contacts: 'companyId,firstName,lastName,email,phone,jobTitle,status',
  leads: 'firstName,lastName,email,phone,jobTitle,companyId',
  opportunities:
    'name,description,amount,currency,stage,expectedCloseDate,companyId,contactId',
};
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function TransferPage() {
  const api = useOperations();
  const [resource, setResource] = useState<keyof typeof templates>('companies'),
    [file, setFile] = useState<File>(),
    [preview, setPreview] = useState<Record<string, unknown>>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [confirm, setConfirm] = useState(false);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      if (api.active())
        setError(e instanceof Error ? e.message : 'Transfer failed.');
    } finally {
      if (api.active()) setBusy(false);
    }
  }
  return (
    <WorkflowFrame
      title="Import and export"
      busy={busy}
      onRefresh={() => {
        setPreview(undefined);
        setNotice('');
      }}
    >
      <p>
        Imports create new records; they do not update existing rows. The entire
        file is validated first. Do not retry a timed-out import until you have
        checked the resulting records.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label>
        Transfer resource
        <select
          disabled={busy}
          value={resource}
          onChange={(e) => {
            setResource(e.target.value as keyof typeof templates);
            setFile(undefined);
            setPreview(undefined);
          }}
        >
          {Object.keys(templates).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <p>
        Exports include permitted active records, capped at 1,000 rows. If you
        have more records, this export is incomplete.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          void action(async () => {
            const blob = await api.exportCsv(resource);
            if (api.active()) download(blob, resource + '-v1.csv');
          })
        }
      >
        Export {resource} CSV
      </button>
      {api.admin ? (
        <>
          <h3>Import CSV</h3>
          <button
            disabled={busy}
            onClick={() =>
              download(
                new Blob([templates[resource] + '\r\n'], {
                  type: 'text/csv;charset=utf-8',
                }),
                resource + '-template-v1.csv',
              )
            }
          >
            Download import template
          </button>
          <label>
            CSV file
            <input
              key={resource}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0]);
                setPreview(undefined);
              }}
            />
          </label>
          <p>
            Maximum 5 MiB, 5,000 rows. Related IDs must identify active records
            in this organization.
          </p>
          <button
            disabled={busy || !file}
            onClick={() =>
              void action(async () => {
                const result = await api.preview(resource, file!);
                if (api.active()) setPreview(result);
              })
            }
          >
            Validate CSV
          </button>
          {preview && (
            <section aria-label="Import preview">
              <p>
                {String(preview.totalRows)} total · {String(preview.validRows)}{' '}
                valid · {String(preview.invalidRows)} invalid rows
              </p>
              <ul>
                {(preview.errors as Record<string, unknown>[]).map((r, i) => (
                  <li key={i}>
                    {Object.entries(r)
                      .map(([k, v]) => k + ': ' + String(v))
                      .join(' · ')}
                  </li>
                ))}
              </ul>
              <button
                disabled={
                  busy ||
                  Number(preview.invalidRows) !== 0 ||
                  Number(preview.validRows) === 0
                }
                onClick={() => setConfirm(true)}
              >
                Import validated CSV
              </button>
            </section>
          )}
        </>
      ) : (
        <p>
          CSV import requires ADMIN or OWNER. You may export records you can
          view.
        </p>
      )}
      {confirm && (
        <Confirmation
          message={`Create ${String(preview?.validRows)} ${resource} records from ${file?.name}?`}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            void action(async () => {
              const result = await api.importCsv(resource, file!);
              if (api.active()) {
                setPreview(undefined);
                setFile(undefined);
                setNotice(
                  `Import confirmed: ${String(result.createdRecords)} records created.`,
                );
              }
            });
          }}
        />
      )}
    </WorkflowFrame>
  );
}
