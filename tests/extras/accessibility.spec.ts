import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures/test';

const BLOCKING = ['critical', 'serious'];

for (const target of [
  { name: 'search (companies)', path: '/search/companies' },
  { name: 'lists', path: '/lists' },
]) {
  test(`a11y: ${target.name} has no critical/serious violations`, { tag: ['@regression', '@a11y'] }, async ({ page }, testInfo) => {
    await page.goto(target.path);
    await expect(page.getByRole('navigation').first()).toBeVisible();

    const axePage = page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'];
    const results = await new AxeBuilder({ page: axePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await testInfo.attach('axe-results.json', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });

    const blocking = results.violations
      .filter((v) => BLOCKING.includes(v.impact ?? ''))
      .map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes) ${v.helpUrl}`);
    expect(blocking, blocking.join('\n')).toEqual([]);
  });
}
