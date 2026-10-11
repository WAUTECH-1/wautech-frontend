export const themes = [
  'Midnight Glass',
  'Arctic Light',
  'Cyber Command',
  'Executive Gold',
] as const;
export type Theme = (typeof themes)[number];
export const navigation = [
  'Overview',
  'Companies',
  'Contacts',
  'Leads',
  'Opportunities',
  'Sales pipeline',
  'Activities',
  'Tasks',
  'Settings',
] as const;
export type Page = (typeof navigation)[number];
export type DataState = 'ready' | 'loading' | 'empty' | 'error';
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
export function readPreference(key: string, fallback: string) {
  try {
    return typeof window === 'undefined'
      ? fallback
      : window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Optional browser preferences. */
  }
}
