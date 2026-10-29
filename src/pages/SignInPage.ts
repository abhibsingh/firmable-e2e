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
    this.emailInput = page.getByLabel(/email address/i).or(page.locator('input[name="identifier"]')).first();
    this.passwordInput = page.getByLabel(/^password$/i).or(page.locator('input[name="password"]')).first();
    this.continueButton = page.getByRole('button', { name: /^(continue|sign in)$/i }).first();
    this.formError = page
      .locator('.cl-formFieldErrorText, .cl-alertText, [id$="-error-feedback"], [role="alert"]')
      .first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.continueButton.click();
    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.fill(password);
    await this.continueButton.click();
  }

  async submitInvalid(email: string, password: string): Promise<void> {
    await this.signIn(email, password);
    await expect(this.formError).toBeVisible();
  }
}
