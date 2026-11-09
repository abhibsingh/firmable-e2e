import { expect, type Locator, type Page } from '@playwright/test';
import { routes } from '../config/routes';
import { parseCount } from '../utils/text';

/** Reads the balance from Account settings > Credits (Subscription credits card). */
export class CreditBalance {
  constructor(private readonly page: Page) {}

  private card(): Locator {
    return this.page
      .locator('div', { has: this.page.getByText('Subscription credits', { exact: true }) })
      .filter({ has: this.page.getByText('Credits remaining', { exact: true }) })
      .last();
  }

  private async stat(label: string): Promise<number> {
    const block = this.card().getByText(label, { exact: true }).locator('xpath=ancestor::div[2]');
    await expect(block).toContainText(/\d/);
    const value = parseCount((await block.innerText()).replace(label, ''));
    if (Number.isNaN(value)) throw new Error(`Could not read "${label}" from the credits page`);
    return value;
  }

  async read(): Promise<{ remaining: number; used: number }> {
    const back = this.page.url();
    await this.page.goto(routes.credits);
    await expect(this.card()).toBeVisible();
    const balance = { remaining: await this.stat('Credits remaining'), used: await this.stat('Credit used') };
    if (back && !back.startsWith('about:')) await this.page.goto(back);
    return balance;
  }

  /** The balance updates asynchronously after a paid action, so poll it. */
  async waitForSpend(before: { remaining: number; used: number }, timeout = 30_000) {
    let latest = before;
    await expect
      .poll(async () => (latest = await this.read()).remaining, { timeout, intervals: [2_000, 3_000, 5_000] })
      .toBeLessThan(before.remaining);
    return latest;
  }
}
