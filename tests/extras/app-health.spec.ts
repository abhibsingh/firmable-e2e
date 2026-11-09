import { test, expect } from '../../src/fixtures/test';
import { routes } from '../../src/config/routes';

for (const path of [routes.dashboard, routes.search, routes.lists, routes.downloadCenter]) {
  test(`health: ${path} loads without JS errors or 5xx`, { tag: ['@smoke', '@health'] }, async ({ page, appShell }) => {
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('response', (r) => {
      if (r.status() >= 500 && new URL(r.url()).hostname.includes('firmable')) serverErrors.push(`${r.status()} ${r.url()}`);
    });

    const start = Date.now();
    await page.goto(path);
    await appShell.expectSignedIn();
    await expect(appShell.root).toBeVisible();
    const elapsed = Date.now() - start;

    test.info().annotations.push({ type: 'load-ms', description: String(elapsed) });
    expect(pageErrors, 'uncaught exceptions').toEqual([]);
    expect(serverErrors, '5xx responses').toEqual([]);
    expect.soft(elapsed, 'page took unusually long (signal only)').toBeLessThan(15_000);
  });
}
