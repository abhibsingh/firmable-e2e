import { expect, type Locator, type Page, type Response } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitUntilReady();
  }

  abstract waitUntilReady(): Promise<void>;

  protected async waitForNoLoaders(scope: Locator | Page = this.page): Promise<void> {
    const loaders = scope.locator(
      '[aria-busy="true"], [role="progressbar"], [data-testid*="skeleton" i], [class*="skeleton" i], [class*="spinner" i]',
    );
    await expect(loaders).toHaveCount(0, { timeout: 20_000 });
  }

  protected async actAndWaitForResponse(
    urlPattern: RegExp,
    action: () => Promise<unknown>,
    opts: { method?: string; timeout?: number } = {},
  ): Promise<Response> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          urlPattern.test(r.url()) &&
          (!opts.method || r.request().method() === opts.method) &&
          r.request().resourceType() !== 'document',
        { timeout: opts.timeout ?? 30_000 },
      ),
      action(),
    ]);
    return response;
  }

  protected async clickWithOptionalConfirm(
    trigger: Locator,
    confirm: Locator,
    urlPattern: RegExp,
    opts: { nonGetOnly?: boolean; timeout?: number } = {},
  ): Promise<Response> {
    const responsePromise = this.page.waitForResponse(
      (r) => urlPattern.test(r.url()) && (!opts.nonGetOnly || r.request().method() !== 'GET'),
      { timeout: opts.timeout ?? 30_000 },
    );
    await trigger.click();
    const first = await Promise.race([
      responsePromise.then(() => 'response' as const),
      confirm.waitFor({ state: 'visible', timeout: opts.timeout ?? 30_000 }).then(() => 'confirm' as const),
    ]);
    if (first === 'confirm') await confirm.click();
    return responsePromise;
  }

  toast(text?: string | RegExp): Locator {
    const toasts = this.page.locator('[role="status"], [role="alert"], [data-sonner-toast], .Toastify__toast');
    return text ? toasts.filter({ hasText: text }) : toasts;
  }
}
