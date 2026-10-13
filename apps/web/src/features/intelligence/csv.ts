import type { Snapshot, LeadRow } from './data';
import { leadStatuses } from '@wautech/umer/contracts';
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csv(rows: readonly (readonly unknown[])[]) {
  return (
    '\uFEFF' +
    rows.map((row) => row.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  );
}
export function reportCsv(
  data: Snapshot,
  leads: readonly LeadRow[] | undefined,
  scope: string,
) {
  const rows: unknown[][] = [
    [
      'dataset',
      'scope',
      'category',
      'count',
      'currency',
      'amount',
      'retrieved_at',
    ],
  ];
  if (leads)
    for (const status of leadStatuses)
      rows.push([
        'leads',
        scope,
        status,
        leads.filter((row) => row.status === status).length,
        '',
        '',
        data.asOf,
      ]);
  if (data.pipeline.status === 'ready')
    for (const stage of data.pipeline.value) {
      rows.push([
        'opportunities',
        'current non-archived records',
        stage.stage,
        stage.count,
        '',
        '',
        data.asOf,
      ]);
      for (const [currency, amount] of Object.entries(stage.totals))
        rows.push([
          'pipeline_value',
          'current non-archived records',
          stage.stage,
          '',
          currency,
          amount,
          data.asOf,
        ]);
    }
  if (data.tasks.status === 'ready')
    for (const status of ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      rows.push([
        'tasks',
        'current non-archived records',
        status,
        data.tasks.value.filter((row) => row.status === status).length,
        '',
        '',
        data.asOf,
      ]);
  if (data.activities.status === 'ready')
    rows.push([
      'activities',
      'current non-archived records',
      'recorded',
      data.activities.value.length,
      '',
      '',
      data.asOf,
    ]);
  for (const key of ['companies', 'contacts'] as const)
    if (data[key].status === 'ready')
      rows.push([
        key,
        'current non-archived records',
        'total',
        data[key].value,
        '',
        '',
        data.asOf,
      ]);
  for (const [key, value] of Object.entries(data))
    if (typeof value === 'object' && value.status === 'error')
      rows.push([key, 'unavailable', value.message, '', '', '', data.asOf]);
  return csv(rows);
}
export function downloadCsv(contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wautech-authorized-sales-report.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
