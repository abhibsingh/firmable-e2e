import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';

test.describe('Company profile', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('companies');
    await searchPage.keywordSearch(searchData.companies.keyword);
  });

  test('side panel previews the selected company', { tag: ['@smoke', '@profile'] }, async ({ searchPage, page }) => {
    const name = await searchPage.previewRow(0);
    const panel = searchPage.sidePanel;

    await expect(panel.title).toContainText(name, { ignoreCase: true });
    await expect(panel.root.getByText(/industry/i).first()).toBeVisible();
    await expect(panel.root.getByText(/employees|headcount/i).first()).toBeVisible();

    await test.step('panel does not lose search context', async () => {
      await expect(page).toHaveURL(/search/);
      await expect(searchPage.results.rows.first()).toBeVisible();
    });

    await test.step('switching rows updates the panel', async () => {
      const second = await searchPage.previewRow(1);
      expect(second).not.toBe(name);
    });

    await test.step('Escape closes the panel', async () => {
      await panel.closeWithEscape();
    });
  });

  test('full view shows the same company with key sections', { tag: ['@regression', '@profile'] }, async ({ searchPage, companyProfile, page }) => {
    const name = await searchPage.previewRow(0);
    await searchPage.sidePanel.openFullView();
    await companyProfile.waitUntilReady();
    await companyProfile.expectProfileOf(name);

    await test.step('deep link is stable on reload', async () => {
      const url = page.url();
      await page.reload();
      await companyProfile.waitUntilReady();
      await expect(page).toHaveURL(url);
      await expect(companyProfile.heading).toContainText(name, { ignoreCase: true });
    });

    await test.step('people at this company are listed', async () => {
      await companyProfile.peopleTab.click();
      await expect(page.getByRole('row').or(page.getByRole('listitem')).nth(1)).toBeVisible();
    });
  });

  test('unknown company id shows not found, not a crash', { tag: ['@regression', '@profile', '@negative'] }, async ({ companyProfile }) => {
    await companyProfile.gotoById('00000000-does-not-exist');
    await expect(companyProfile.notFound).toBeVisible();
  });
});
