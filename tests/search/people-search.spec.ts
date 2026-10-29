import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';

const { people } = searchData;

test.describe('People search', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('people');
  });

  test('keyword + two filters narrow people results', { tag: ['@regression', '@search'] }, async ({ searchPage }) => {
    const baseline = await searchPage.results.total();

    await searchPage.keywordSearch(people.keyword);
    const afterKeyword = await searchPage.results.total();
    expect(afterKeyword).toBeLessThanOrEqual(baseline);

    await searchPage.applyFilter(people.filters.seniority.filter, people.filters.seniority.value);
    const afterSeniority = await searchPage.results.total();
    expect(afterSeniority).toBeLessThanOrEqual(afterKeyword);

    await searchPage.applyFilter(people.filters.department.filter, people.filters.department.value);
    const afterDepartment = await searchPage.results.total();
    expect(afterDepartment).toBeLessThanOrEqual(afterSeniority);
    expect(afterDepartment).toBeGreaterThan(0);
  });

  test('contradictory filters give empty state, not an error', { tag: ['@regression', '@search', '@negative'] }, async ({ searchPage }) => {
    await searchPage.keywordSearch(searchData.noResultsKeyword);
    await searchPage.applyFilter(people.filters.location.filter, people.filters.location.value);
    await expect(searchPage.results.emptyState).toBeVisible();
  });

  test('switching tabs keeps companies and people searches independent', { tag: ['@regression', '@search'] }, async ({ searchPage, page }) => {
    await searchPage.keywordSearch(people.keyword);
    await searchPage.open('companies');
    await expect(searchPage.keywordInput).not.toHaveValue(people.keyword);
    await page.goBack();
    await expect(searchPage.keywordInput).toHaveValue(new RegExp(people.keyword, 'i'));
  });
});
