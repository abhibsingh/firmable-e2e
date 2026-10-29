import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { AppShell } from '../components/AppShell';
import type { NewUser } from '../data/testData';

export class OnboardingPage extends BasePage {
  readonly path = '/onboarding';
  private readonly shell: AppShell;
  readonly primaryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.shell = new AppShell(page);
    this.primaryButton = page
      .getByRole('button', { name: /^(continue|next|get started|finish|done|let'?s go|skip( for now)?)$/i })
      .first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.primaryButton.or(this.shell.root)).toBeVisible();
  }

  async complete(user: NewUser, maxSteps = 8): Promise<number> {
    for (let step = 1; step <= maxSteps; step++) {
      await expect(this.primaryButton.or(this.shell.root)).toBeVisible({ timeout: 20_000 });
      if (await this.shell.root.isVisible()) return step - 1;

      await this.fillVisibleRequiredFields(user);
      await this.chooseFirstOptionIfAny();
      await this.primaryButton.click();
    }
    throw new Error(`Onboarding did not reach the app within ${maxSteps} steps`);
  }

  private async fillVisibleRequiredFields(user: NewUser): Promise<void> {
    const textInputs = this.page.locator(
      'main input[type="text"]:visible, main input:not([type]):visible, main textarea:visible',
    );
    for (const input of await textInputs.all()) {
      if ((await input.inputValue()) !== '') continue;
      const label = ((await input.getAttribute('name')) ?? (await input.getAttribute('placeholder')) ?? '').toLowerCase();
      if (label.includes('first')) await input.fill(user.firstName);
      else if (label.includes('last')) await input.fill(user.lastName);
      else if (label.includes('company') || label.includes('organi')) await input.fill(user.company);
      else await input.fill('QA automation');
    }
  }

  private async chooseFirstOptionIfAny(): Promise<void> {
    const radio = this.page.getByRole('radio').first();
    if ((await radio.isVisible()) && !(await radio.isChecked())) await radio.check();

    const combobox = this.page.getByRole('combobox').first();
    if (await combobox.isVisible()) {
      await combobox.click();
      const option = this.page.getByRole('option').first();
      if (await option.isVisible()) await option.click();
    }
  }
}
