import { expect, type Locator, type Page } from '@playwright/test';
import { parseCount } from '../utils/text';

export class ResultsTable {
  readonly root: Locator;
  readonly rows: Locator;
  readonly totalCount: Locator;
  readonly emptyState: Locator;
  readonly selectAll: Locator;
  readonly selectedCount: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('results-table').or(page.getByRole('table')).or(page.getByRole('grid')).first();
    this.rows = this.root
      .locator('tbody [role="row"], tbody tr, [role="rowgroup"] [role="row"]')
      .filter({ hasNot: page.locator('th') });
    this.totalCount = page
      .getByTestId('results-count')
      .or(page.getByText(/^[\d,.]+[kKmM]?\s+(results?|companies|people|contacts|records)\b/i))
      .first();
    this.emptyState = page
      .getByTestId('empty-state')
      .or(page.getByText(/no (results|companies|people|records) (found|match)|try (adjusting|changing) your/i))
      .first();
    this.selectAll = this.root.getByRole('checkbox', { name: /select all/i }).or(this.root.locator('thead input[type="checkbox"]')).first();
    this.selectedCount = page.getByText(/\d+\s+selected/i).first();
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.rows.first().or(this.emptyState)).toBeVisible({ timeout: 30_000 });
  }

  async total(): Promise<number> {
    await expect(this.totalCount).toBeVisible();
    return parseCount(await this.totalCount.innerText());
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  nameOf(index: number): Locator {
    return this.row(index).getByRole('link').or(this.row(index).getByRole('button')).first();
  }

  async names(limit = 10): Promise<string[]> {
    const count = Math.min(await this.rows.count(), limit);
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push((await this.nameOf(i).innerText()).trim());
    return out;
  }

  async selectRows(count: number): Promise<string[]> {
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      await this.row(i).getByRole('checkbox').first().check();
      names.push((await this.nameOf(i).innerText()).trim());
    }
    await expect(this.selectedCount).toContainText(String(count));
    return names;
  }

  async openPreview(index: number): Promise<string> {
    const name = (await this.nameOf(index).innerText()).trim();
    await this.nameOf(index).click();
    return name;
  }

  rowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }
}
