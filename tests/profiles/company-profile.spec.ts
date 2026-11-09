import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';

test.describe('Company profile', () => {
  test('full view from the quick view matches the selected company', { tag: ['@smoke', '@profile'] }, async ({ searchPage, companyProfile }) => {
    await searchPage.open('companies');
    await searchPage.keywordSearch(searchData.companies.keyword);
    const name = await searchPage.previewRow(0);

    await searchPage.sidePanel.openFullView();
    await companyProfile.expectProfileOf(name);
  });

  test('name link opens the full view directly and Back returns to search', { tag: ['@regression', '@profile'] }, async ({ page, searchPage, companyProfile }) => {
    await searchPage.open('companies');
    const name = await searchPage.results.name(0);
    await searchPage.results.nameLink(0).click();
    await companyProfile.expectProfileOf(name);

    await companyProfile.backButton.click();
    await expect(page).toHaveURL(/\/dashboard\/search/);
  });

  test('profile is reachable by deep link', { tag: ['@regression', '@profile'] }, async ({ page, searchPage, companyProfile }) => {
    await searchPage.open('companies');
    const name = await searchPage.results.name(0);
    const href = (await searchPage.results.nameLink(0).getAttribute('href')) ?? '';

    await page.goto(href);
    await companyProfile.expectProfileOf(name);
  });

  test('unknown company id does not crash the app', { tag: ['@regression', '@profile', '@negative'] }, async ({ page, companyProfile }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await companyProfile.gotoById('does-not-exist-000');
    await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible();
    await expect(companyProfile.profileTab).toBeHidden();
    expect(errors).toEqual([]);
  });
});
