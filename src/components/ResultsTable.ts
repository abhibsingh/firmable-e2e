import { expect, type Locator, type Page } from '@playwright/test';

/** Mantine table used by search results and list detail pages. */
export class ResultsTable {
  readonly root: Locator;
  readonly rows: Locator;
  readonly pager: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('table.mantine-Table-root').first();
    this.rows = this.root.locator('tbody tr').filter({ has: page.getByRole('checkbox') });
    this.pager = page.getByText(/^\d[\d,]*-\d[\d,]* of [\d,]+$|^0-0 of 0$/).first();
    this.emptyState = page.getByText(/no records to display|no (results|companies|people) (found|added)|create your first/i).first();
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.rows.first().or(this.emptyState)).toBeVisible({ timeout: 30_000 });
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  /** Name link in the first data column (company or person). */
  nameLink(index: number): Locator {
    return this.row(index).locator('td').nth(1).getByRole('link').first();
  }

  async name(index: number): Promise<string> {
    return (await this.row(index).locator('td').nth(1).innerText()).replace(/^[A-Z]{1,2}\n/, '').trim();
  }

  async names(limit = 10): Promise<string[]> {
    const count = Math.min(await this.rows.count(), limit);
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(await this.name(i));
    return out;
  }

  cellText(index: number, column: number): Promise<string> {
    return this.row(index).locator('td').nth(column).innerText();
  }

  async selectRows(count: number): Promise<string[]> {
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      await this.row(i).getByRole('checkbox').first().check();
      names.push(await this.name(i));
    }
    return names;
  }

  /** Clicking a non link cell opens the quick view side panel. */
  async openPreview(index: number): Promise<string> {
    const name = await this.name(index);
    await this.row(index).locator('td').nth(2).click();
    return name;
  }

  rowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  async headerSearch(placeholder: RegExp, value: string): Promise<void> {
    const input = this.page.getByPlaceholder(placeholder).first();
    await input.fill(value);
    await input.press('Enter');
  }
}
