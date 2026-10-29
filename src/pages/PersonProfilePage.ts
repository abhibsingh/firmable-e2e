import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ContactReveal } from '../components/ContactReveal';

export class PersonProfilePage extends BasePage {
  readonly path = '/person';
  readonly heading: Locator;
  readonly jobTitle: Locator;
  readonly companyLink: Locator;
  readonly contact: ContactReveal;
  readonly notFound: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 }).first();
    this.jobTitle = page.getByTestId('person-title').or(this.heading.locator('xpath=following::*[1]')).first();
    this.companyLink = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('[href*="compan"]') }).first();
    this.contact = new ContactReveal(page, page.locator('main'));
    this.notFound = page.getByText(/not found|doesn'?t exist|404|something went wrong/i).first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await this.waitForNoLoaders();
  }

  async gotoById(id: string): Promise<void> {
    await this.page.goto(`${this.path}/${id}`);
  }

  async expectProfileOf(name: string): Promise<void> {
    await expect(this.page).toHaveURL(/people|person|contact/i);
    await expect(this.heading).toContainText(name, { ignoreCase: true });
    await expect(this.jobTitle).not.toBeEmpty();
  }
}
