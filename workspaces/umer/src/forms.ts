import type { Contact, Requests, Resource } from './contracts';
export interface Field {
  key: string;
  label: string;
  required?: boolean;
  max?: number;
  type?: string;
}
const person: Field[] = [
  { key: 'firstName', label: 'First name', required: true, max: 100 },
  { key: 'lastName', label: 'Last name', required: true, max: 100 },
  { key: 'email', label: 'Email', type: 'email', max: 254 },
  { key: 'phone', label: 'Phone', max: 40 },
  { key: 'jobTitle', label: 'Job title', max: 120 },
];
export const fields: Record<Resource, Field[]> = {
  companies: [
    { key: 'name', label: 'Company name', required: true, max: 200 },
    { key: 'website', label: 'Website', max: 2048 },
    { key: 'industry', label: 'Industry', max: 120 },
    { key: 'phone', label: 'Phone', max: 40 },
    { key: 'email', label: 'Email', type: 'email', max: 254 },
    { key: 'status', label: 'Status', max: 40 },
  ],
  contacts: [
    { key: 'companyId', label: 'Company', required: true },
    ...person,
    { key: 'status', label: 'Status', max: 40 },
  ],
  leads: [{ key: 'companyId', label: 'Company' }, ...person],
  opportunities: [
    { key: 'name', label: 'Opportunity name', required: true, max: 200 },
    { key: 'description', label: 'Description', max: 10000 },
    { key: 'companyId', label: 'Company', required: true },
    { key: 'contactId', label: 'Contact' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'currency', label: 'Currency', max: 3 },
    { key: 'expectedCloseDate', label: 'Expected close date', type: 'date' },
  ],
};
export type Values = Record<string, string>;
export function validate(
  resource: Resource,
  values: Values,
  contacts: Contact[] = [],
): Values {
  const errors: Values = {};
  for (const field of fields[resource]) {
    const value = values[field.key] || '';
    if (field.required && !value.trim())
      errors[field.key] = `${field.label} is required.`;
    if (field.max && value.length > field.max)
      errors[field.key] = `Use at most ${field.max} characters.`;
    if (
      field.type === 'email' &&
      value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
      errors[field.key] = 'Enter a valid email address.';
    if (
      field.key.endsWith('Id') &&
      value &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    )
      errors[field.key] = 'Select a valid record UUID.';
  }
  if (resource === 'opportunities') {
    if (!!values.amount !== !!values.currency) {
      errors.amount = 'Provide amount and currency together.';
      errors.currency = errors.amount;
    }
    if (
      values.amount &&
      (!Number.isFinite(Number(values.amount)) || Number(values.amount) < 0)
    )
      errors.amount = 'Amount must be zero or greater.';
    if (values.currency && !/^[A-Z]{3}$/.test(values.currency))
      errors.currency = 'Use a three-letter uppercase currency code.';
    if (
      values.contactId &&
      !contacts.some(
        (c) => c.id === values.contactId && c.companyId === values.companyId,
      )
    )
      errors.contactId = 'Contact must belong to the selected company.';
  }
  return errors;
}
export function toRequest<K extends Resource>(
  resource: K,
  values: Values,
): Requests[K] {
  const body: Record<string, string | number | null> = {};
  for (const field of fields[resource]) {
    const value = values[field.key] || '';
    body[field.key] =
      field.key === 'amount'
        ? value
          ? Number(value)
          : null
        : value.trim() || null;
  }
  return body as unknown as Requests[K];
}
export function paginate<T>(rows: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.max(1, Math.min(page, pages));
  return {
    items: rows.slice((current - 1) * size, current * size),
    page: current,
    pages,
    total: rows.length,
  };
}
