import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ContactReveal } from '../components/ContactReveal';
import { routes, urlPatterns } from '../config/routes';

/** Full person view: /dashboard/people/<id> */
export class PersonProfilePage extends BasePage {
  readonly path = routes.dashboard;
  readonly backButton: Locator;
  readonly contact: ContactReveal;

  constructor(page: Page) {
    super(page);
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.contact = new ContactReveal(page, page.locator('body'));
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.backButton).toBeVisible({ timeout: 30_000 });
  }

  async gotoById(id: string): Promise<void> {
    await this.page.goto(routes.person(id));
  }

  async expectProfileOf(name: string): Promise<void> {
    await expect(this.page).toHaveURL(urlPatterns.person);
    await this.waitUntilReady();
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
  }
}
