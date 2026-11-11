import { type Locator, type Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async goto(): Promise<void> {
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    await this.waitUntilReady();
  }

  abstract waitUntilReady(): Promise<void>;

  toast(text: string | RegExp): Locator {
    return this.page.getByText(text).first();
  }
}
