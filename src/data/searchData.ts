// Values verified on staging: "bank" 2,066,723 -> 2,266; + Industry Banking -> 932; + Sydney -> 77
export const searchData = {
  companies: {
    keyword: 'bank',
    filters: {
      industry: { filter: 'Industry', key: 'industry', value: 'Banking', rowText: /Banking/ },
      location: { filter: 'Location (Company)', key: 'location', value: 'Sydney, NSW, AU', rowText: /NSW/ },
    },
  },
  people: {
    keyword: 'smith',
  },
  ai: {
    prompt: 'Banks in Sydney with more than 500 employees',
  },
  noResultsKeyword: 'zzqxnosuchcompany9f3a7',
  edgeKeywords: ['"; DROP TABLE companies; --', '<script>alert(1)</script>', 'ß é 中文'],
} as const;
