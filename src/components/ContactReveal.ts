import { expect, type Locator, type Page } from '@playwright/test';
import { api } from '../config/routes';
import { EMAIL_REGEX, MASKED_REGEX, PHONE_REGEX } from '../utils/text';

export type ContactKind = 'email' | 'phone';

export class ContactReveal {
  constructor(
    private readonly page: Page,
    private readonly scope: Locator,
  ) {}

  button(kind: ContactKind): Locator {
    const name = kind === 'email' ? /reveal (work )?email|show email|get email/i : /reveal (mobile|phone)|show (phone|mobile)|get (phone|mobile)/i;
    return this.scope.getByRole('button', { name }).first();
  }

  value(kind: ContactKind): Locator {
    return kind === 'email'
      ? this.scope.getByRole('link', { name: EMAIL_REGEX }).or(this.scope.getByText(EMAIL_REGEX)).first()
      : this.scope.getByRole('link', { name: PHONE_REGEX }).or(this.scope.getByText(PHONE_REGEX)).first();
  }

  async isAlreadyRevealed(kind: ContactKind): Promise<boolean> {
    if (await this.button(kind).isVisible()) return false;
    const text = (await this.value(kind).textContent()) ?? '';
    return !MASKED_REGEX.test(text);
  }

  async reveal(kind: ContactKind): Promise<{ value: string; status: number }> {
    const responsePromise = this.page.waitForResponse(
      (r) => api.reveal.test(r.url()) && r.request().method() !== 'GET',
    );
    await this.button(kind).click();
    const confirm = this.page.getByRole('dialog').getByRole('button', { name: /^(reveal|confirm|continue|use \d+ credits?)/i }).first();
    const first = await Promise.race([
      responsePromise.then(() => 'response' as const),
      confirm.waitFor({ state: 'visible' }).then(() => 'confirm' as const),
    ]);
    if (first === 'confirm') await confirm.click();
    const response = await responsePromise;

    await expect(this.value(kind)).toBeVisible();
    const value = (await this.value(kind).innerText()).trim();
    expect(value, 'revealed value must not be masked').not.toMatch(MASKED_REGEX);
    return { value, status: response.status() };
  }
}
