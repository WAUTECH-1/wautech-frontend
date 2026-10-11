import type { Company, RecordDto, Resource } from './contracts';
export function RecordTable({
  resource,
  rows,
  companies,
  loading,
  error,
  onOpen,
  onEdit,
  onArchive,
}: {
  resource: Resource;
  rows: RecordDto[];
  companies: Company[];
  loading: boolean;
  error: boolean;
  onOpen: (r: RecordDto) => void;
  onEdit: (r: RecordDto) => void;
  onArchive: (r: RecordDto) => void;
}) {
  if (loading)
    return (
      <div role="status" aria-label="Loading records" className="skeletons">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="skeleton" />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="empty">
        <span>!</span>
        <h3>Records could not be loaded</h3>
        <p>Check the error above, then retry.</p>
      </div>
    );
  if (!rows.length)
    return (
      <div className="empty">
        <span>◇</span>
        <h3>No {resource} found</h3>
        <p>Create your first record or adjust your search and filters.</p>
      </div>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>{resource === 'companies' ? 'Industry' : 'Company'}</th>
            <th>{resource === 'opportunities' ? 'Value' : 'Email'}</th>
            <th>{resource === 'opportunities' ? 'Stage' : 'Status'}</th>
            <th>Updated</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name =
              'name' in row ? row.name : `${row.firstName} ${row.lastName}`;
            return (
              <tr key={row.id}>
                <td>
                  <button className="record-link" onClick={() => onOpen(row)}>
                    <span className="record-avatar">{name.slice(0, 1)}</span>
                    <span>
                      {name}
                      <small>
                        {'jobTitle' in row
                          ? row.jobTitle
                          : 'website' in row
                            ? row.website
                            : row.id.slice(0, 8)}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  {'industry' in row
                    ? row.industry || '—'
                    : 'companyId' in row
                      ? companies.find((c) => c.id === row.companyId)?.name ||
                        row.companyId ||
                        '—'
                      : '—'}
                </td>
                <td>
                  {'amount' in row
                    ? row.amount === null
                      ? '—'
                      : `${row.currency} ${row.amount.toLocaleString()}`
                    : 'email' in row
                      ? row.email || '—'
                      : '—'}
                </td>
                <td>
                  <span className="badge">
                    {'stage' in row ? row.stage : row.status}
                  </span>
                </td>
                <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
                <td className="row-actions">
                  <button
                    onClick={() => onEdit(row)}
                    aria-label={`Edit ${name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onArchive(row)}
                    aria-label={`Archive ${name}`}
                  >
                    Archive
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
