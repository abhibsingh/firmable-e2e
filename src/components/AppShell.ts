import { expect, type Locator, type Page } from '@playwright/test';
import { CreditBalance } from './CreditBalance';

export class AppShell {
  readonly root: Locator;
  readonly nav: Locator;
  readonly userMenuButton: Locator;
  readonly credits: CreditBalance;

  constructor(private readonly page: Page) {
    this.nav = page.getByRole('navigation').first();
    this.root = page.getByTestId('app-shell').or(this.nav).first();
    this.userMenuButton = page
      .getByTestId('user-menu')
      .or(page.locator('.cl-userButtonTrigger'))
      .or(page.getByRole('button', { name: /account|profile|user menu|open user/i }))
      .first();
    this.credits = new CreditBalance(page);
  }

  async expectSignedIn(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: 30_000 });
    await expect(this.page).not.toHaveURL(/sign-in|sign-up/);
  }

  async navigateTo(section: 'Search' | 'Lists' | 'Settings'): Promise<void> {
    await this.nav.getByRole('link', { name: new RegExp(section, 'i') }).first().click();
  }

  async signOut(): Promise<void> {
    await this.userMenuButton.click();
    await this.page.getByRole('menuitem', { name: /sign out|log ?out/i })
      .or(this.page.getByRole('button', { name: /sign out|log ?out/i }))
      .first()
      .click();
    await expect(this.page).toHaveURL(/sign-in|login|\/$/, { timeout: 30_000 });
  }
}
