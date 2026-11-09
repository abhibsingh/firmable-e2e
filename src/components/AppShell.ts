import { expect, type Locator, type Page } from '@playwright/test';

export class AppShell {
  readonly root: Locator;
  readonly userMenuButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('[data-elements="Search"]').first();
    this.userMenuButton = page.getByRole('button', { name: 'Open user menu' });
  }

  navLink(section: 'Home' | 'Search' | 'Lists' | 'Signals' | 'download-center'): Locator {
    return this.page.locator(`[data-elements="${section}"]`).first();
  }

  async expectSignedIn(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: 30_000 });
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async signOut(): Promise<void> {
    await this.userMenuButton.click();
    await this.page.getByRole('button', { name: /^sign out$/i }).or(this.page.getByText(/^sign out$/i)).first().click();
    await expect(this.page).toHaveURL(/sign-in|\/$/, { timeout: 30_000 });
  }

  toast(text: string | RegExp): Locator {
    return this.page.getByText(text).first();
  }
}
