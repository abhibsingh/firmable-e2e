import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { routes, urlPatterns } from '../config/routes';

/** Full company view: /dashboard/company/<id> */
export class CompanyProfilePage extends BasePage {
  readonly path = routes.dashboard;
  readonly backButton: Locator;
  readonly profileTab: Locator;
  readonly peopleTab: Locator;
  readonly addToListButton: Locator;

  constructor(page: Page) {
    super(page);
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.profileTab = page.getByRole('tab', { name: 'Profile' });
    this.peopleTab = page.getByRole('tab', { name: /^People \(/ });
    this.addToListButton = page.getByRole('button', { name: 'Add to list' });
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.profileTab).toBeVisible({ timeout: 30_000 });
  }

  async gotoById(id: string): Promise<void> {
    await this.page.goto(routes.company(id));
  }

  async expectProfileOf(name: string): Promise<void> {
    await expect(this.page).toHaveURL(urlPatterns.company);
    await this.waitUntilReady();
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
    await expect(this.profileTab).toHaveAttribute('aria-selected', 'true');
    await expect(this.peopleTab).toBeVisible();
  }
}
