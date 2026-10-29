import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';
import { env } from '../../src/config/env';
import { api } from '../../src/config/routes';
import { ContactReveal, type ContactKind } from '../../src/components/ContactReveal';
import { EMAIL_REGEX, PHONE_REGEX } from '../../src/utils/text';
import type { SearchPage } from '../../src/pages/SearchPage';
import type { Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function findUnrevealedPerson(page: Page, searchPage: SearchPage, kind: ContactKind, maxRows = 10) {
  for (let i = 0; i < maxRows; i++) {
    const name = await searchPage.previewRow(i);
    const reveal = new ContactReveal(page, searchPage.sidePanel.root);
    if (await reveal.button(kind).isVisible()) return { name, reveal };
  }
  throw new Error(`No unrevealed ${kind} found in the first ${maxRows} rows. Change the search keyword in searchData.`);
}

test.describe('Reveal contact details', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('people');
    await searchPage.keywordSearch(searchData.people.keyword);
  });

  test('revealing an email shows a valid address and deducts credits', { tag: ['@smoke', '@credits'] }, async ({
    page,
    creditGuard,
    searchPage,
    appShell,
  }) => {
    const { name, reveal } = await findUnrevealedPerson(page, searchPage, 'email');
    test.info().annotations.push({ type: 'revealed-person', description: name });

    const { value, status } = await reveal.reveal('email');
    expect(status, 'reveal API should succeed').toBeLessThan(400);
    expect(value).toMatch(EMAIL_REGEX);

    const after = await appShell.credits.waitForDecreaseFrom(creditGuard.balanceBefore);
    const spent = creditGuard.balanceBefore - after;
    test.info().annotations.push({ type: 'credits-spent', description: String(spent) });
    if (env.emailRevealCost !== undefined) expect(spent).toBe(env.emailRevealCost);
    else expect(spent).toBeGreaterThan(0);

    await test.step('server agrees with the UI (fresh read after reload)', async () => {
      expect(await appShell.credits.readFresh()).toBe(after);
    });

    await test.step('revealing the same contact again is NOT charged twice', async () => {
      await searchPage.open('people');
      await searchPage.keywordSearch(searchData.people.keyword);
      await searchPage.results.rowByName(name).first().getByRole('link').or(searchPage.results.rowByName(name).first()).first().click();
      await expect(reveal.button('email')).toBeHidden();
      await expect(reveal.value('email')).toHaveText(value);
      expect(await appShell.credits.read()).toBe(after);
    });
  });

  test('revealing a phone number shows a valid number and deducts credits', { tag: ['@regression', '@credits'] }, async ({
    page,
    creditGuard,
    searchPage,
    appShell,
  }) => {
    const { reveal } = await findUnrevealedPerson(page, searchPage, 'phone');
    const { value } = await reveal.reveal('phone');
    expect(value).toMatch(PHONE_REGEX);

    const after = await appShell.credits.waitForDecreaseFrom(creditGuard.balanceBefore);
    if (env.phoneRevealCost !== undefined) expect(creditGuard.balanceBefore - after).toBe(env.phoneRevealCost);
  });

  test('insufficient credits: reveal fails gracefully and balance is untouched', { tag: ['@regression', '@credits', '@negative'] }, async ({
    page,
    searchPage,
    appShell,
  }) => {
    // mocked, so no real credits are spent
    const before = await appShell.credits.read();
    await page.route(api.reveal, (route) =>
      route.request().method() === 'GET'
        ? route.fallback()
        : route.fulfill({
            status: 402,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'INSUFFICIENT_CREDITS', message: 'You do not have enough credits' }),
          }),
    );

    const { reveal } = await findUnrevealedPerson(page, searchPage, 'email');
    await reveal.button('email').click();

    await expect(
      page.getByText(/not enough credits|insufficient credits|out of credits|upgrade|top ?up/i).first(),
    ).toBeVisible();
    await expect(reveal.button('email'), 'contact must stay hidden').toBeVisible();
    expect(await appShell.credits.read()).toBe(before);
  });
});
