import { expect, type Locator, type Page } from '@playwright/test';

export class SidePanel {
  readonly root: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly fullViewLink: Locator;

  constructor(private readonly page: Page) {
    this.root = page
      .getByTestId('side-panel')
      .or(page.getByRole('dialog'))
      .or(page.locator('[data-state="open"][role="complementary"]'))
      .first();
    this.title = this.root.getByRole('heading').first();
    this.closeButton = this.root.getByRole('button', { name: /close/i }).first();
    this.fullViewLink = this.root
      .getByRole('link', { name: /view (full )?profile|open|full view|see more/i })
      .or(this.root.getByRole('button', { name: /view (full )?profile|open|full view|expand/i }))
      .first();
  }

  async expectOpenFor(name: string): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.title).toContainText(name, { ignoreCase: true });
  }

  section(name: string | RegExp): Locator {
    return this.root.getByRole('heading', { name }).or(this.root.getByText(name)).first();
  }

  async openFullView(): Promise<void> {
    await this.fullViewLink.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.root).toBeHidden();
  }
}
