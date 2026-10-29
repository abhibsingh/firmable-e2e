import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { routes } from '../config/routes';
import type { NewUser } from '../data/testData';

export class SignUpPage extends BasePage {
  readonly path = routes.signUp;

  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly otpInput: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    super(page);
    this.firstName = page.getByLabel(/first name/i).or(page.locator('input[name="firstName"]')).first();
    this.lastName = page.getByLabel(/last name/i).or(page.locator('input[name="lastName"]')).first();
    this.email = page.getByLabel(/email address/i).or(page.locator('input[name="emailAddress"]')).first();
    this.password = page.getByLabel(/^password$/i).or(page.locator('input[name="password"]')).first();
    this.submit = page.getByRole('button', { name: /^(continue|sign up|create account)$/i }).first();
    this.otpInput = page
      .locator('input[autocomplete="one-time-code"]')
      .or(page.getByLabel(/verification code|enter code/i))
      .first();
    this.formError = page
      .locator('.cl-formFieldErrorText, .cl-alertText, [id$="-error-feedback"], [role="alert"]')
      .first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.email).toBeVisible();
  }

  async fillDetails(user: NewUser): Promise<void> {
    if (await this.firstName.isVisible()) await this.firstName.fill(user.firstName);
    if (await this.lastName.isVisible()) await this.lastName.fill(user.lastName);
    await this.email.fill(user.email);
    if (await this.password.isVisible()) await this.password.fill(user.password);
    await this.submit.click();
  }

  async enterVerificationCode(code: string): Promise<void> {
    await expect(this.otpInput).toBeVisible();
    await this.otpInput.click();
    await this.page.keyboard.type(code);
  }
}
