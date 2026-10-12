export const routes = [
  { path: '/login', title: 'Sign in', access: 'public', module: 'auth' },
  {
    path: '/dashboard',
    title: 'Dashboard',
    access: 'tenant',
    module: 'dashboard',
  },
  { path: '/companies', title: 'Companies', access: 'tenant', module: 'crm' },
  { path: '/contacts', title: 'Contacts', access: 'tenant', module: 'crm' },
  { path: '/leads', title: 'Leads', access: 'tenant', module: 'crm' },
  {
    path: '/opportunities',
    title: 'Opportunities',
    access: 'tenant',
    module: 'crm',
  },
  {
    path: '/activities',
    title: 'Activities',
    access: 'tenant',
    module: 'future',
  },
  { path: '/tasks', title: 'Tasks', access: 'tenant', module: 'future' },
  { path: '/settings', title: 'Settings', access: 'session', module: 'future' },
  {
    path: '/unauthorized',
    title: 'Sign-in required',
    access: 'public',
    module: 'status',
  },
  {
    path: '/access-denied',
    title: 'Access denied',
    access: 'public',
    module: 'status',
  },
] as const;
export type Route = (typeof routes)[number];
export type AppPath = Route['path'];
export function resolveRoute(pathname: string): Route | undefined {
  const path = pathname === '/' ? '/dashboard' : pathname;
  return routes.find((route) => route.path === path);
}
