export const searchData = {
  companies: {
    keyword: 'software',
    filters: {
      location: { filter: 'Location', value: 'New South Wales' },
      industry: { filter: 'Industry', value: 'Software' },
      headcount: { filter: 'Employees', value: '51-200' },
    },
  },
  people: {
    keyword: 'engineer',
    filters: {
      seniority: { filter: 'Seniority', value: 'Manager' },
      department: { filter: 'Department', value: 'Engineering' },
      location: { filter: 'Location', value: 'Victoria' },
    },
  },
  ai: {
    prompt: 'Software companies in Sydney with 50 to 200 employees',
  },
  noResultsKeyword: 'zzqx-no-such-company-9f3a7',
  edgeKeywords: ['"; DROP TABLE companies; --', '<script>alert(1)</script>', '   ', 'ß é 中文'],
} as const;
