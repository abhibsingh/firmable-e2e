// Calibrated against staging.firmable.com
export const routes = {
  signIn: '/sign-in',
  signUp: '/sign-up',
  dashboard: '/dashboard',
  search: '/dashboard/search/new',
  lists: '/dashboard/list',
  downloadCenter: '/dashboard/download-center',
  credits: '/dashboard/profile?selected=credits',
  company: (id: string) => `/dashboard/company/${id}`,
  person: (id: string) => `/dashboard/people/${id}`,
} as const;

export const urlPatterns = {
  company: /\/dashboard\/company\/[^/]+$/,
  person: /\/dashboard\/people\/[^/]+$/,
  listDetail: /\/dashboard\/list\/[0-9a-f-]{36}$/,
} as const;
