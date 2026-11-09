import { expect, type Locator, type Page } from '@playwright/test';
import { EMAIL_REGEX, PHONE_REGEX } from '../utils/text';

export type ContactKind = 'email' | 'phone';

/** "Show email" / "Show number" controls in the person quick view or profile. */
export class ContactReveal {
  constructor(
    private readonly page: Page,
    private readonly scope: Locator,
  ) {}

  button(kind: ContactKind): Locator {
    return this.scope.getByRole('button', { name: kind === 'email' ? 'Show email' : 'Show number' });
  }

  value(kind: ContactKind): Locator {
    return this.scope.getByText(kind === 'email' ? EMAIL_REGEX : PHONE_REGEX).first();
  }

  async reveal(kind: ContactKind): Promise<string> {
    await this.button(kind).click();
    const confirm = this.page.getByRole('dialog').getByRole('button', { name: /^(reveal|confirm|continue|show|yes)/i }).first();
    await expect(this.value(kind).or(confirm)).toBeVisible();
    if (await confirm.isVisible()) await confirm.click();
    await expect(this.value(kind)).toBeVisible({ timeout: 20_000 });
    return (await this.value(kind).innerText()).trim();
  }
}
