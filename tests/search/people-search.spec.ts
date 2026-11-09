import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';

test.describe('People search', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('people');
  });

  test('people tab shows results and keyword search narrows them', { tag: ['@smoke', '@search'] }, async ({ searchPage }) => {
    const all = await searchPage.total('people');
    expect(all).toBeGreaterThan(0);

    const narrowed = await searchPage.keywordSearch(searchData.people.keyword, 'people');
    expect(narrowed).toBeGreaterThan(0);
    expect(narrowed).toBeLessThan(all);
    for (const name of await searchPage.results.names(10)) expect(name.toLowerCase()).toContain(searchData.people.keyword);
  });

  test('switching tabs keeps both counts available', { tag: ['@regression', '@search'] }, async ({ searchPage }) => {
    await searchPage.switchTo('companies');
    expect(await searchPage.total('companies')).toBeGreaterThan(0);
    await searchPage.switchTo('people');
    expect(await searchPage.total('people')).toBeGreaterThan(0);
  });

  test('person quick view shows masked contacts with reveal buttons', { tag: ['@smoke', '@search'] }, async ({ page, searchPage }) => {
    await searchPage.previewRow(0);
    expect(await searchPage.sidePanel.fullViewHref()).toMatch(/\/dashboard\/people\//);
    await expect(page.getByRole('button', { name: 'Show email' }).or(page.getByRole('button', { name: 'Show number' })).first()).toBeVisible();
    await searchPage.sidePanel.close();
  });
});
