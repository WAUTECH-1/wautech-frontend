import { deals, money } from './demo';
import type { Page } from './contracts';
export function DemoDirectory({ mode = 'Opportunities' }: { mode?: Page }) {
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
