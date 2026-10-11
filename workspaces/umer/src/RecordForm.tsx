import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CrmApi } from './api';
import type { Company, Contact, RecordDto, Resource } from './contracts';
import { fields, toRequest, validate } from './forms';
import type { Values } from './forms';
import { Dialog } from './Dialog';
const singular: Record<Resource, string> = {
  companies: 'company',
  contacts: 'contact',
  leads: 'lead',
  opportunities: 'opportunity',
};
export function RecordForm({
  api,
  resource,
  record,
  companies,
  contacts,
  onClose,
  onSaved,
}: {
  api: CrmApi;
  resource: Resource;
  record: RecordDto | null;
  companies: Company[];
  contacts: Contact[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(
      fields[resource].map((f) => [
        f.key,
        record
          ? String((record as unknown as Record<string, unknown>)[f.key] ?? '')
          : f.key === 'status'
            ? 'ACTIVE'
            : '',
      ]),
    ),
  );
  const [errors, setErrors] = useState<Values>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    const invalid = validate(resource, values, contacts);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    setError('');
    try {
      const body = toRequest(resource, values);
      if (record) await api.update(resource, record.id, body);
      else await api.create(resource, body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  function change(key: string, value: string) {
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === 'companyId' ? { contactId: '' } : {}),
    }));
    setErrors((v) => ({ ...v, [key]: '' }));
  }
  return (
    <Dialog titleId="form-title" onClose={onClose} busy={busy}>
      <button
        className="close"
        aria-label="Close form"
        disabled={busy}
        onClick={onClose}
      >
        ×
      </button>
      <p className="eyebrow">CRM OPERATIONS</p>
      <h2 id="form-title">
        {record ? 'Edit' : 'New'} {singular[resource]}
      </h2>
      <form noValidate onSubmit={save}>
        <div className="form-grid">
          {fields[resource].map((field) => (
            <label key={field.key} htmlFor={`field-${field.key}`}>
              {field.label}
              {field.required ? ' *' : ''}
              {field.key === 'companyId' || field.key === 'contactId' ? (
                <select
                  id={`field-${field.key}`}
                  value={values[field.key]}
                  disabled={busy}
                  onChange={(e) => change(field.key, e.target.value)}
                  aria-invalid={!!errors[field.key]}
                  aria-describedby={
                    errors[field.key] ? `error-${field.key}` : undefined
                  }
                >
                  <option value="">
                    {field.required ? 'Select a record' : 'None'}
                  </option>
                  {field.key === 'companyId'
                    ? companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    : contacts
                        .filter((c) => c.companyId === values.companyId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName}
                          </option>
                        ))}
                </select>
              ) : field.key === 'description' ? (
                <textarea
                  id={`field-${field.key}`}
                  maxLength={field.max}
                  disabled={busy}
                  value={values[field.key]}
                  onChange={(e) => change(field.key, e.target.value)}
                />
              ) : (
                <input
                  id={`field-${field.key}`}
                  type={field.type || 'text'}
                  min={field.type === 'number' ? 0 : undefined}
                  step={field.type === 'number' ? 'any' : undefined}
                  maxLength={field.max}
                  disabled={busy}
                  value={values[field.key]}
                  onChange={(e) => change(field.key, e.target.value)}
                  aria-invalid={!!errors[field.key]}
                  aria-describedby={
                    errors[field.key] ? `error-${field.key}` : undefined
                  }
                />
              )}
              <small id={`error-${field.key}`} className="field-error">
                {errors[field.key]}
              </small>
            </label>
          ))}
        </div>
        {resource === 'leads' && !record && (
          <p className="small muted">
            New leads start at NEW. Change status from the detail view.
          </p>
        )}
        {resource === 'opportunities' && (
          <p className="small muted">
            New opportunities start at QUALIFICATION. Change stages from the
            detail view.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save record'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
