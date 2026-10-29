import { expect, type Locator, type Page } from '@playwright/test';
import { parseCount } from '../utils/text';

export class CreditBalance {
  readonly badge: Locator;

  constructor(private readonly page: Page) {
    this.badge = page
      .getByTestId('credit-balance')
      .or(page.getByText(/\d[\d,.]*\s*(k\s*)?credits?/i))
      .first();
  }

  async read(): Promise<number> {
    await expect(this.badge).toBeVisible();
    const value = parseCount(await this.badge.innerText());
    if (Number.isNaN(value)) throw new Error(`Could not parse credit balance from "${await this.badge.innerText()}"`);
    return value;
  }

  async readFresh(): Promise<number> {
    await this.page.reload();
    return this.read();
  }

  async waitForDecreaseFrom(before: number, timeout = 20_000): Promise<number> {
    let latest = before;
    await expect
      .poll(async () => (latest = await this.read()), {
        timeout,
        message: `credit balance should drop below ${before}`,
      })
      .toBeLessThan(before);
    return latest;
  }
}
