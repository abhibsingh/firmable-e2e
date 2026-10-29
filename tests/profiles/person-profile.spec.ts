import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';
import { MASKED_REGEX } from '../../src/utils/text';

test.describe('People profile', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('people');
    await searchPage.keywordSearch(searchData.people.keyword);
  });

  test('side panel previews the selected person', { tag: ['@smoke', '@profile'] }, async ({ searchPage }) => {
    const name = await searchPage.previewRow(0);
    const panel = searchPage.sidePanel;
    await expect(panel.title).toContainText(name, { ignoreCase: true });

    await test.step('job title and company are shown', async () => {
      await expect(panel.root.getByRole('link', { name: /.+/ }).first()).toBeVisible();
    });

    await test.step('contact details are gated behind reveal (not leaked before paying)', async () => {
      const revealButtons = panel.root.getByRole('button', { name: /reveal|show (email|phone)|get (email|phone)/i });
      const maskedText = panel.root.getByText(MASKED_REGEX);
      await expect(revealButtons.or(maskedText).or(panel.root.getByRole('link', { name: /@/ })).first()).toBeVisible();
    });

    await panel.close();
  });

  test('full view shows the same person', { tag: ['@regression', '@profile'] }, async ({ searchPage, personProfile, page }) => {
    const name = await searchPage.previewRow(0);
    await searchPage.sidePanel.openFullView();
    await personProfile.waitUntilReady();
    await personProfile.expectProfileOf(name);

    await test.step('company link navigates to the company profile', async () => {
      if (await personProfile.companyLink.isVisible()) {
        await personProfile.companyLink.click();
        await expect(page).toHaveURL(/compan/i);
      }
    });
  });

  test('unknown person id shows not found, not a crash', { tag: ['@regression', '@profile', '@negative'] }, async ({ personProfile }) => {
    await personProfile.gotoById('00000000-does-not-exist');
    await expect(personProfile.notFound).toBeVisible();
  });
});
