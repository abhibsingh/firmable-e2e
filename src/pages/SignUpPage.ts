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
    this.firstName = page.locator('input[name="firstName"]:visible').first();
    this.lastName = page.locator('input[name="lastName"]:visible').first();
    this.email = page.locator('input[name="emailAddress"]:visible').first();
    this.phone = page.locator('input[name="phoneNumber"]:visible').first();
    this.password = page.locator('input[name="password"]:visible').first();
    this.submit = page.getByRole('button', { name: 'Continue', exact: true });
    this.otpInput = page.locator('input[autocomplete="one-time-code"]').or(page.getByLabel(/verification code|enter code/i)).first();
    this.formError = page.locator('.cl-formFieldErrorText:visible, .cl-alertText:visible, [id$="-error-feedback"]:visible').first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.email).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Clerk test numbers are +1 (XXX) 555 0100 to 0199 and each can belong to only one account,
   * so pick a random one. Typing "+1" switches the country picker to US, then the field is cleared
   * and only the 10 local digits are typed.
   */
  private async fillTestPhone(): Promise<void> {
    if (!(await this.phone.isVisible())) return;
    const areas = [201, 202, 203, 205, 206, 207, 208, 209, 210, 212, 213, 214, 215, 216, 217];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const line = String(100 + Math.floor(Math.random() * 100)).padStart(4, '0');
    await this.phone.click();
    await this.phone.pressSequentially('+1');
    await this.phone.fill('');
    await this.phone.pressSequentially(`${area}555${line}`);
    await expect(this.phone).toHaveValue(new RegExp(`${area}.*555.*${line.slice(-2)}$`));
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
    const locked = this.page.getByText(/temporarily locked|too many requests/i).first();
    await expect(this.otpInput.or(locked)).toBeVisible({ timeout: 20_000 });
    if (await locked.isVisible()) throw new Error(`Clerk rate limited sign up from this machine: "${await locked.innerText()}"`);
    await this.otpInput.click();
    await this.page.keyboard.type(code);
  }
}
