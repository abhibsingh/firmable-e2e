import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';

const { keyword, filters } = searchData.companies;

test.describe('Company search', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('companies');
  });

  test('keyword search narrows results and every row matches', { tag: ['@smoke', '@search'] }, async ({ searchPage }) => {
    const all = await searchPage.total('companies');
    const narrowed = await searchPage.keywordSearch(keyword);

    expect(narrowed).toBeGreaterThan(0);
    expect(narrowed).toBeLessThan(all);
    for (const name of await searchPage.results.names(10)) expect(name.toLowerCase()).toContain(keyword);
  });

  test('stacked filters narrow monotonically and rows match each filter', { tag: ['@smoke', '@search'] }, async ({ searchPage }) => {
    const afterKeyword = await searchPage.keywordSearch(keyword);

    const afterIndustry = await test.step('include Industry: Banking', () =>
      searchPage.applyFilter(filters.industry.filter, filters.industry.key, filters.industry.value),
    );
    expect(afterIndustry).toBeLessThan(afterKeyword);

    const afterLocation = await test.step('include Location: Sydney', () =>
      searchPage.applyFilter(filters.location.filter, filters.location.key, filters.location.value),
    );
    expect(afterLocation).toBeGreaterThan(0);
    expect(afterLocation).toBeLessThan(afterIndustry);
    expect(await searchPage.filters.appliedCount()).toBe(2);

    const rows = await searchPage.results.rows.count();
    for (let i = 0; i < Math.min(rows, 10); i++) {
      await expect(searchPage.results.row(i)).toContainText(filters.industry.rowText);
      await expect(searchPage.results.row(i)).toContainText(filters.location.rowText);
    }
  });

  test('clearing filters restores the keyword result count', { tag: ['@regression', '@search'] }, async ({ searchPage }) => {
    const afterKeyword = await searchPage.keywordSearch(keyword);
    await searchPage.applyFilter(filters.industry.filter, filters.industry.key, filters.industry.value);
    await searchPage.clearFilters();

    await expect(searchPage.filters.appliedTags).toHaveCount(0);
    expect(await searchPage.total('companies')).toBeGreaterThanOrEqual(afterKeyword);
  });

  test('nonsense keyword shows an empty state, not an error', { tag: ['@regression', '@search', '@negative'] }, async ({ page, searchPage }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await searchPage.keywordSearch(searchData.noResultsKeyword);

    expect(await searchPage.total('companies')).toBe(0);
    await expect(searchPage.results.rows).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  for (const term of searchData.edgeKeywords) {
    test(`special input is handled safely: ${JSON.stringify(term)}`, { tag: ['@regression', '@search', '@negative'] }, async ({ page, searchPage }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => {
        errors.push(`unexpected dialog: ${d.message()}`);
        void d.dismiss();
      });

      await searchPage.results.headerSearch(/Search by Company name/, term);
      await searchPage.results.waitForLoaded();
      await expect(searchPage.tab('companies')).toHaveText(/\([\d,]+\)/);
      expect(errors).toEqual([]);
    });
  }

  test('quick view opens for the selected company and closes', { tag: ['@smoke', '@search'] }, async ({ searchPage }) => {
    await searchPage.keywordSearch(keyword);
    await searchPage.previewRow(0);
    expect(await searchPage.sidePanel.fullViewHref()).toMatch(/\/dashboard\/company\//);
    await searchPage.sidePanel.close();
  });
});
