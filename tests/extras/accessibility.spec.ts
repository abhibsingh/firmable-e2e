import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures/test';
import { routes } from '../../src/config/routes';

const BLOCKING = ['critical', 'serious'];

// Violations already present on staging (see docs/FINDINGS.md, F2). The gate fails only on NEW ones,
// so a regression is caught without blocking every release on the existing backlog.
const KNOWN: Record<string, string[]> = {
  search: ['color-contrast', 'html-has-lang', 'nested-interactive'],
  lists: ['button-name', 'color-contrast', 'html-has-lang', 'nested-interactive'],
};

for (const target of [
  { name: 'search', path: routes.search },
  { name: 'lists', path: routes.lists },
]) {
  test(`a11y: ${target.name} has no new critical/serious violations`, { tag: ['@regression', '@a11y'] }, async ({ page, appShell }, testInfo) => {
    await page.goto(target.path);
    await expect(appShell.root).toBeVisible({ timeout: 30_000 });

    const axePage = page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'];
    const results = await new AxeBuilder({ page: axePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await testInfo.attach('axe-results.json', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });

    const blocking = results.violations.filter((v) => BLOCKING.includes(v.impact ?? ''));
    const known = blocking.filter((v) => KNOWN[target.name].includes(v.id)).map((v) => v.id);
    testInfo.annotations.push({ type: 'a11y-known', description: known.join(', ') || 'none' });

    const fresh = blocking
      .filter((v) => !KNOWN[target.name].includes(v.id))
      .map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes) ${v.helpUrl}`);
    expect(fresh, fresh.join('\n')).toEqual([]);
  });
}
