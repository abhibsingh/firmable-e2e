import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CompanyProfilePage extends BasePage {
  readonly path = '/company';
  readonly heading: Locator;
  readonly tabs: Locator;
  readonly website: Locator;
  readonly peopleTab: Locator;
  readonly notFound: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 }).first();
    this.tabs = page.getByRole('tablist').first();
    this.website = page.getByRole('link', { name: /https?:\/\/|www\.|\.com|\.au/i }).first();
    this.peopleTab = page.getByRole('tab', { name: /people|employees|contacts/i }).first();
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
    await expect(this.page).toHaveURL(/compan/i);
    await expect(this.heading).toContainText(name, { ignoreCase: true });
    for (const label of [/industry/i, /employees|headcount/i, /location|headquarters|hq/i]) {
      await expect(this.page.getByText(label).first(), `section ${label} should render`).toBeVisible();
    }
  }
}
