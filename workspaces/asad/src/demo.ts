export const deals = [
  {
    company: 'Northstar Labs',
    initials: 'NL',
    name: 'Platform modernization',
    value: 84000,
    stage: 'Proposal',
    owner: 'Sarah Chen',
  },
  {
    company: 'Orbit Systems',
    initials: 'OS',
    name: 'Enterprise intelligence',
    value: 62000,
    stage: 'Negotiation',
    owner: 'James Miller',
  },
  {
    company: 'Meridian Group',
    initials: 'MG',
    name: 'CRM transformation',
    value: 48000,
    stage: 'Qualified',
    owner: 'Asad',
  },
  {
    company: 'Vertex Digital',
    initials: 'VD',
    name: 'Analytics rollout',
    value: 36000,
    stage: 'Discovery',
    owner: 'Sarah Chen',
  },
];
export const tasks = [
  'Send Northstar proposal',
  'Prepare Orbit discovery call',
  'Review Meridian requirements',
];
export const notifications = [
  'Northstar proposal needs your review',
  'Orbit follow-up is due today',
  'Weekly pipeline review is ready',
];
export const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
import type { DashboardData, WorkspaceUser } from './contracts';
export const demoUser: WorkspaceUser = {
  name: 'Asad',
  initials: 'AS',
  roleLabel: 'Workspace developer',
  workspaceName: 'WAUTECH LTD',
  authenticated: false,
};
export function createDemoData(period: string): DashboardData {
  const values =
    period === 'This quarter'
      ? [22, 36, 28, 52, 44, 68, 58, 76, 64, 89, 78, 96]
      : [35, 28, 45, 38, 58, 49, 67, 56, 75, 66, 84, 78];
  return {
    provenance: {
      kind: 'demo',
      label: 'Sample records and metrics. Backend is not connected.',
    },
    metrics: [
      {
        id: 'value',
        label: 'Opportunity value',
        value: '$230,000',
        change: '+18.6%',
        icon: 'Opportunities',
        detail: 'Across 4 sample opportunities',
        trend: [2, 9, 5, 16, 12, 21, 17, 27],
      },
      {
        id: 'companies',
        label: 'Active companies',
        value: '128',
        change: '+12.3%',
        icon: 'Companies',
        detail: '386 sample contacts',
        trend: [2, 9, 5, 16, 12, 21, 17, 27],
      },
      {
        id: 'leads',
        label: 'Open leads',
        value: '24',
        change: '+8.2%',
        icon: 'Leads',
        detail: '16 qualified · 8 new',
        trend: [2, 9, 5, 16, 12, 21, 17, 27],
      },
      {
        id: 'wins',
        label: 'Win rate',
        value: '68.4%',
        change: '+4.8 pts',
        icon: 'up',
        detail: 'Illustrative performance',
        trend: [2, 9, 5, 16, 12, 21, 17, 27],
      },
    ],
    performance: {
      currency: 'USD',
      description: 'Illustrative opportunity values; not booked revenue',
      summary: { amount: 230000, currency: 'USD' },
      change: '18.6%',
      points: values.map((v, i) => ({
        label: `Sample ${i + 1}`,
        current: v * 1000,
        previous: v * 680,
      })),
    },
    pipeline: deals.map((d, i) => ({
      id: `stage-${i}`,
      stage: d.stage,
      count: 1,
      totals: [{ amount: d.value, currency: 'USD' }],
    })),
    opportunities: deals.map((d, i) => ({
      ...d,
      id: `deal-${i}`,
      value: { amount: d.value, currency: 'USD' },
    })),
    tasks: tasks.map((title, i) => ({
      id: `task-${i}`,
      title,
      detail: i === 0 ? 'Today · High priority' : 'This week · Follow-up',
      initials: ['SC', 'JM', 'AS'][i],
      completed: false,
    })),
    priorities: [
      {
        id: 'proposal',
        title: 'Move your next deal forward',
        description: 'Northstar Labs is waiting on a proposal review.',
        icon: 'Opportunities',
        target: 'Opportunities',
      },
      {
        id: 'reconnect',
        title: 'Reconnect with a promising lead',
        description: 'Schedule the next conversation with Orbit Systems.',
        icon: 'Contacts',
        target: 'Leads',
      },
    ],
    activities: [
      'Sarah updated the Northstar proposal',
      'James added a contact at Orbit Systems',
      'Asad qualified the Meridian opportunity',
    ].map((text, i) => ({
      id: `activity-${i}`,
      text,
      timeLabel: `${[15, 42, 58][i]} minutes ago · sample`,
    })),
    notifications: notifications.map((title, i) => ({
      id: `notification-${i}`,
      title,
      detail: 'Demonstration update',
      read: false,
    })),
  };
}
