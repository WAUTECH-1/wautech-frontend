/** Manual fixture: excluded from the standalone production entry and host export graph. */
import { createRoot } from 'react-dom/client';
import { ThemeScope, DashboardView } from './integration';
import { createDemoData } from './demo';
import './themes.css';
import './dashboard.css';
const data = createDemoData('This quarter');
data.pipeline = [
  {
    id: 'mixed',
    stage: 'Proposal',
    count: 2,
    totals: [
      { amount: 100, currency: 'USD' },
      { amount: 200, currency: 'EUR' },
    ],
  },
];
const root = document.getElementById('preview');
if (!root) throw new Error('Missing preview root');
createRoot(root).render(
  <ThemeScope theme="Arctic Light">
    <DashboardView data={data} period="Demonstration contract preview" />
  </ThemeScope>,
);
