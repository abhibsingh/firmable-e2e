import { test, expect } from '../../src/fixtures/test';
import { ContactReveal } from '../../src/components/ContactReveal';
import { env } from '../../src/config/env';

// Spends about 1 credit per run on the shared staging account.
test.describe('Contact reveal (spends credits)', () => {
  test('revealing an email shows a real address and deducts credits', { tag: ['@regression', '@credits'] }, async ({
    page,
    searchPage,
    credits,
    creditGuard,
  }) => {
    await searchPage.open('people');
    const contact = new ContactReveal(page, page.locator('body'));

    let found = false;
    for (let i = 0; i < 10 && !found; i++) {
      await searchPage.openPerson(i);
      found = await contact.button('email').isVisible();
      if (!found) await searchPage.open('people');
    }
    test.skip(!found, 'No person with an unrevealed email in the first 10 rows');

    const email = await contact.reveal('email');
    expect(email).toMatch(/^[^\s@*]+@[^\s@]+\.[a-z]{2,}$/i);

    const after = await credits.waitForSpend(creditGuard.before);
    const spent = creditGuard.before.remaining - after.remaining;
    test.info().annotations.push({ type: 'credits-spent', description: String(spent) });
    if (env.emailRevealCost !== undefined) expect(spent).toBe(env.emailRevealCost);
    else expect(spent).toBeGreaterThan(0);
  });
});
