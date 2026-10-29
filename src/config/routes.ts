export const routes = {
  signIn: '/sign-in',
  signUp: '/sign-up',
  search: '/search',
  companiesSearch: '/search/companies',
  peopleSearch: '/search/people',
  lists: '/lists',
  settings: '/settings',
} as const;

export const api = {
  search: /\/api\/.*(search|query|companies|people).*$/i,
  reveal: /\/api\/.*(reveal|unlock|contact).*$/i,
  credits: /\/api\/.*(credit|usage|balance|billing).*$/i,
  lists: /\/api\/.*lists?.*$/i,
  export: /\/api\/.*(export|download).*$/i,
} as const;
