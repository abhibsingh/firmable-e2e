import { expect, type Locator, type Page } from '@playwright/test';

/** Quick view panel that slides in from the right for both companies and people. */
export class SidePanel {
  readonly root: Locator;
  readonly fullViewLink: Locator;
  readonly closeButton: Locator;
  readonly addButton: Locator;

  constructor(page: Page) {
    this.fullViewLink = page.getByRole('link', { name: 'View full profile' });
    this.root = page.locator('div', { has: this.fullViewLink }).filter({ has: page.getByRole('button', { name: 'Add' }) }).last();
    this.closeButton = page.getByRole('button', { name: 'Close' }).last();
    this.addButton = this.root.getByRole('button', { name: 'Add' });
  }

  async expectOpenFor(name: string): Promise<void> {
    await expect(this.fullViewLink).toBeVisible();
    await expect(this.root.getByText(name, { exact: true }).first()).toBeVisible();
  }

  async fullViewHref(): Promise<string> {
    return (await this.fullViewLink.getAttribute('href')) ?? '';
  }

  async openFullView(): Promise<void> {
    await this.fullViewLink.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.fullViewLink).toBeHidden();
  }
}
