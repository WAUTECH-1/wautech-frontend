import { useCallback, useState } from 'react';
import { useLoad } from '../workflows/hooks';
import { relationshipFields } from '../workflows/contracts';
import { LoadState } from '../workflows/ui';
import { page, rows } from './api';
import type { OperationsApi } from './api';

export default function NoteRecordPicker({
  api,
  initialField,
  initialId,
}: {
  api: OperationsApi;
  initialField: (typeof relationshipFields)[number];
  initialId: string;
}) {
  const [field, setField] = useState(initialField);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(initialId);
  const resource =
    field === 'companyId'
      ? 'companies'
      : field === 'contactId'
        ? 'contacts'
        : field === 'leadId'
          ? 'leads'
          : 'opportunities';
  const loader = useCallback(
    async (signal: AbortSignal) =>
      page(
        await api.read(
          '/records/' +
            resource +
            '?size=100&search=' +
            encodeURIComponent(search),
          signal,
        ),
        (v) => rows([v])[0],
      ),
    [api, resource, search],
  );
  const data = useLoad(resource + ':' + search, loader);
  const values = data.data?.content || [];
  return (
    <>
      <label>
        Related entity
        <select
          name="relation"
          value={field}
          onChange={(e) => {
            setField(e.target.value as typeof field);
            setSelected('');
            setSearch('');
          }}
        >
          {relationshipFields.map((f) => (
            <option key={f} value={f}>
              {f.replace('Id', '')}
            </option>
          ))}
        </select>
      </label>
      <label>
        Search related records
        <input
          type="search"
          value={search}
          maxLength={200}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <LoadState
        error={data.error}
        loading={!data.data && !data.error}
        onRetry={() => setSearch('')}
      />
      <label>
        Related record
        <select
          name="recordId"
          required
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Choose a record</option>
          {selected && !values.some((v) => v.id === selected) && (
            <option value={selected}>Selected record · {selected}</option>
          )}
          {values.map((v) => (
            <option key={v.id} value={v.id}>
              {String(
                v.name ||
                  [v.firstName, v.lastName].filter(Boolean).join(' ') ||
                  v.id,
              )}{' '}
              · {v.id}
            </option>
          ))}
        </select>
      </label>
      {data.data && data.data.totalElements > 100 && (
        <p>
          Showing the first 100 matches. Refine your search to find another
          record.
        </p>
      )}
    </>
  );
}
