import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { AppShell } from '../components/AppShell';
import { routes } from '../config/routes';
import type { NewUser } from '../data/testData';

/**
 * After sign up the user lands on /dashboard with a "Find your ideal customers"
 * personalisation card ("Your role", "What you sell", "Skip for now").
 * Any extra Clerk steps before that are driven with a bounded loop.
 */
export class OnboardingPage extends BasePage {
  readonly path = routes.dashboard;
  private readonly shell: AppShell;
  readonly primaryButton: Locator;
  readonly skipPersonalisation: Locator;

  constructor(page: Page) {
    super(page);
    this.shell = new AppShell(page);
    this.primaryButton = page.getByRole('button', { name: /^(continue|next|get started|finish|done)$/i }).first();
    this.skipPersonalisation = page.getByRole('button', { name: 'Skip for now' });
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.primaryButton.or(this.shell.root)).toBeVisible({ timeout: 30_000 });
  }

  async complete(_user: NewUser, maxSteps = 6): Promise<number> {
    for (let step = 0; step < maxSteps; step++) {
      await this.waitUntilReady();
      if (await this.shell.root.isVisible()) {
        if (await this.skipPersonalisation.isVisible()) await this.skipPersonalisation.click();
        return step;
      }
      await this.primaryButton.click();
    }
    throw new Error(`Onboarding did not reach the dashboard within ${maxSteps} steps`);
  }
}
