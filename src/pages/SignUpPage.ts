import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { routes } from '../config/routes';
import type { NewUser } from '../data/testData';

/**
 * Clerk sign up on staging: first name, last name, work email, mobile number (country picker,
 * defaults to IN) and password, then "Continue" and a verification code (424242 in test mode).
 */
export class SignUpPage extends BasePage {
  readonly path = routes.signUp;

  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly otpInput: Locator;
  readonly formError: Locator;

  constructor(page: Page) {
    super(page);
    this.firstName = page.locator('input[name="firstName"]');
    this.lastName = page.locator('input[name="lastName"]');
    this.email = page.locator('input[name="emailAddress"]');
    this.phone = page.locator('input[name="phoneNumber"]');
    this.password = page.locator('input[name="password"]');
    this.submit = page.getByRole('button', { name: 'Continue', exact: true });
    this.otpInput = page.locator('input[autocomplete="one-time-code"]').or(page.getByLabel(/verification code|enter code/i)).first();
    this.formError = page.locator('.cl-formFieldErrorText, .cl-alertText, [id$="-error-feedback"], [role="alert"]').first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.email).toBeVisible({ timeout: 30_000 });
  }

  /** Clerk test numbers are +1 (XXX) 555-0100 to 0199, so switch the picker to the US first. */
  private async fillTestPhone(): Promise<void> {
    const required = (await this.phone.getAttribute('required')) !== null || (await this.phone.getAttribute('aria-required')) === 'true';
    if (!required) return;
    const picker = this.page.getByRole('button', { name: /^[A-Z]{2}$/ }).first();
    await picker.click();
    await this.page.keyboard.type('United States');
    await this.page.getByRole('option', { name: /United States/ }).first().click();
    await this.phone.fill('2015550100');
  }

  async fillDetails(user: NewUser): Promise<void> {
    await this.firstName.fill(user.firstName);
    await this.lastName.fill(user.lastName);
    await this.email.fill(user.email);
    await this.fillTestPhone();
    await this.password.fill(user.password);
    await this.submit.click();
  }

  async enterVerificationCode(code: string): Promise<void> {
    await expect(this.otpInput).toBeVisible();
    await this.otpInput.click();
    await this.page.keyboard.type(code);
  }
}
