import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { routes } from '../config/routes';

export class SignInPage extends BasePage {
  readonly path = routes.signIn;

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly continueButton: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="identifier"]:visible').first();
    this.passwordInput = page.locator('input[name="password"]:visible').first();
    this.continueButton = page.getByRole('button', { name: /^(continue|sign in)$/i }).first();
    this.formError = page
      .locator('.cl-formFieldErrorText:visible, .cl-alertText:visible, [id$="-error-feedback"]:visible')
      .first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.emailInput).toBeVisible({ timeout: 30_000 });
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.continueButton.click();
    // Clerk moves to /sign-in/factor-one and re-renders, which can wipe a value typed too early
    await expect(this.page.getByRole('heading', { name: 'Enter your password' })).toBeVisible({ timeout: 30_000 });
    await expect(async () => {
      await this.passwordInput.fill(password);
      await expect(this.passwordInput).toHaveValue(password, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await this.passwordInput.press('Enter');
  }

  readonly passwordStep = () => this.page.getByRole('heading', { name: 'Enter your password' });
}
