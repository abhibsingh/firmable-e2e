import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';

const { companies } = searchData;

test.describe('Company search', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('companies');
  });

  test('keyword search returns relevant results', { tag: ['@smoke', '@search', '@mobile'] }, async ({ page, searchPage }) => {
    const baseline = await searchPage.results.total();

    await searchPage.keywordSearch(companies.keyword);

    const filtered = await searchPage.results.total();
    expect(filtered, 'keyword should return results').toBeGreaterThan(0);
    expect(filtered, 'keyword should narrow the full universe').toBeLessThanOrEqual(baseline);
    await expect(searchPage.results.rows.first()).toBeVisible();
    await page.reload();
    await expect.soft(searchPage.keywordInput).toHaveValue(new RegExp(companies.keyword, 'i'));
  });

  test('two filters narrow results and counts stay consistent', { tag: ['@smoke', '@search'] }, async ({ searchPage }) => {
    const { location, headcount } = companies.filters;
    const counts: Record<string, number> = {};

    await test.step('baseline', async () => {
      counts.baseline = await searchPage.results.total();
      expect(counts.baseline).toBeGreaterThan(0);
    });

    await test.step(`filter 1: ${location.filter} = ${location.value}`, async () => {
      await searchPage.applyFilter(location.filter, location.value);
      counts.afterFirst = await searchPage.results.total();
      expect(counts.afterFirst).toBeGreaterThan(0);
      expect(counts.afterFirst).toBeLessThanOrEqual(counts.baseline);
    });

    await test.step(`filter 2: ${headcount.filter} = ${headcount.value}`, async () => {
      await searchPage.applyFilter(headcount.filter, headcount.value);
      counts.afterSecond = await searchPage.results.total();
      expect(counts.afterSecond).toBeLessThanOrEqual(counts.afterFirst);
    });

    await test.step('visible rows honour the location filter', async () => {
      const rowCount = Math.min(await searchPage.results.rows.count(), 5);
      for (let i = 0; i < rowCount; i++) {
        await expect.soft(searchPage.results.row(i)).toContainText(/NSW|New South Wales|Sydney/i);
      }
    });

    await test.step('page shows no more rows than the total count', async () => {
      expect(await searchPage.results.rows.count()).toBeLessThanOrEqual(counts.afterSecond);
    });

    await test.step('clearing filters restores the baseline', async () => {
      await searchPage.clearFilters();
      await expect.poll(() => searchPage.results.total()).toBe(counts.baseline);
    });

    test.info().annotations.push({ type: 'counts', description: JSON.stringify(counts) });
  });

  test('AI search interprets a natural language query', { tag: ['@regression', '@search', '@ai'] }, async ({ searchPage }) => {
    await searchPage.aiSearch(searchData.ai.prompt);
    expect(await searchPage.results.total()).toBeGreaterThan(0);
    await expect.soft(searchPage.filters.appliedChips.first()).toBeVisible();
  });

  test('no match shows a friendly empty state', { tag: ['@regression', '@search', '@negative'] }, async ({ searchPage }) => {
    await searchPage.keywordSearch(searchData.noResultsKeyword);
    await expect(searchPage.results.emptyState).toBeVisible();
    await expect(searchPage.results.rows).toHaveCount(0);
    await expect(searchPage.toast(/error|went wrong/i)).toHaveCount(0);
  });

  for (const keyword of searchData.edgeKeywords) {
    test(`special input is handled safely: ${JSON.stringify(keyword)}`, { tag: ['@regression', '@search', '@negative'] }, async ({ page, searchPage }) => {
      const dialogs: string[] = [];
      page.on('dialog', async (d) => {
        dialogs.push(d.message());
        await d.dismiss();
      });
      const serverErrors: string[] = [];
      page.on('response', (r) => {
        if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
      });

      await searchPage.keywordInput.fill(keyword);
      await searchPage.keywordInput.press('Enter');
      await searchPage.results.waitForLoaded();

      expect(dialogs, 'no script should execute from search input').toEqual([]);
      expect(serverErrors, 'input should never cause a 5xx').toEqual([]);
    });
  }
});
