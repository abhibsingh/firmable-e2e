import { test, expect } from '../../src/fixtures/test';
import { env } from '../../src/config/env';
import { routes } from '../../src/config/routes';

test.describe('Sign in / sign out', () => {
  test.beforeEach(async ({ signInPage }) => {
    await signInPage.goto();
  });

  test('valid user can sign in and sign out', { tag: ['@smoke', '@auth'] }, async ({ page, signInPage, appShell }) => {
    await test.step('sign in with the test account', async () => {
      await signInPage.signIn(env.userEmail, env.userPassword);
      await appShell.expectSignedIn();
    });

    await test.step('session survives a reload', async () => {
      await page.reload();
      await appShell.expectSignedIn();
    });

    await test.step('sign out returns to sign in', async () => {
      await appShell.signOut();
      await expect(signInPage.emailInput).toBeVisible();
    });

    await test.step('protected page is no longer reachable after sign out', async () => {
      await page.goto(routes.search);
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test('wrong password shows an error and does not sign in', { tag: ['@regression', '@auth', '@negative'] }, async ({ page, signInPage, appShell }) => {
    test.skip(!env.lockoutCanaryEmail, 'Set LOCKOUT_CANARY_EMAIL: wrong passwords against the shared account lock it');
    await signInPage.emailInput.fill(env.lockoutCanaryEmail!);
    await signInPage.continueButton.click();
    await expect(signInPage.passwordStep()).toBeVisible();
    await signInPage.passwordInput.fill('definitely-Wrong-Password-123!');
    await signInPage.passwordInput.press('Enter');
    await expect(signInPage.formError).toBeVisible();
    await expect(page).toHaveURL(/sign-in/);
    await expect(appShell.userMenuButton).toBeHidden();
  });

  test('unknown email is rejected', { tag: ['@regression', '@auth', '@negative'] }, async ({ page, signInPage }) => {
    await signInPage.emailInput.fill(`${env.dataPrefix}-nobody-${Date.now()}@example.com`);
    await signInPage.continueButton.click();
    await expect(signInPage.formError).toBeVisible();
    await expect(signInPage.passwordStep()).toBeHidden();
    await expect(page).not.toHaveURL(/factor-one/);
  });

  test('malformed email is blocked by validation', { tag: ['@regression', '@auth', '@negative'] }, async ({ page, signInPage }) => {
    await signInPage.emailInput.fill('not-an-email');
    await signInPage.continueButton.click();
    await expect(signInPage.passwordStep()).toBeHidden();
    await expect(page).not.toHaveURL(/factor-one/);
  });

  test('deep link redirects to sign in, then back after login', { tag: ['@regression', '@auth'] }, async ({ page, signInPage, appShell }) => {
    await page.goto(routes.lists);
    await expect(page).toHaveURL(/sign-in/);
    await signInPage.signIn(env.userEmail, env.userPassword);
    await appShell.expectSignedIn();
    await expect(page).toHaveURL(/\/dashboard\/list/);
  });
});
