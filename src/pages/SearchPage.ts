import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { FilterPanel } from '../components/FilterPanel';
import { ResultsTable } from '../components/ResultsTable';
import { SidePanel } from '../components/SidePanel';
import { AppShell } from '../components/AppShell';
import { routes } from '../config/routes';
import { parseTabCount } from '../utils/text';

export type Entity = 'companies' | 'people';

export class SearchPage extends BasePage {
  readonly path = routes.search;

  readonly shell: AppShell;
  readonly filters: FilterPanel;
  readonly results: ResultsTable;
  readonly sidePanel: SidePanel;

  readonly aiSearchInput: Locator;
  readonly addToListButton: Locator;
  readonly downloadButton: Locator;

  constructor(page: Page) {
    super(page);
    this.shell = new AppShell(page);
    this.filters = new FilterPanel(page);
    this.results = new ResultsTable(page);
    this.sidePanel = new SidePanel(page);
    this.aiSearchInput = page.getByRole('textbox', { name: 'AI search' });
    this.addToListButton = page.getByRole('button', { name: /^Add to list/ });
    this.downloadButton = page.getByText(/^Download( \(\d+\))?$/).first();
  }

  tab(entity: Entity): Locator {
    return this.page.getByRole('button', { name: entity === 'companies' ? /^Companies \(/ : /^People \(/ });
  }

  async waitUntilReady(): Promise<void> {
    await this.shell.expectSignedIn();
    await expect(this.tab('companies')).toHaveText(/\([\d,]+\)/, { timeout: 30_000 });
    await this.results.waitForLoaded();
  }

  async open(entity: Entity): Promise<void> {
    await this.goto();
    if (entity === 'people') await this.switchTo('people');
  }

  async switchTo(entity: Entity): Promise<void> {
    await this.tab(entity).click();
    await this.results.waitForLoaded();
  }

  /** Total from the tab label, e.g. "Companies (2,066,723)". Not capped like the pager (max 10,000). */
  async total(entity: Entity = 'companies'): Promise<number> {
    return parseTabCount(await this.tab(entity).innerText());
  }

  /** Every search action waits until the tab count actually changes. */
  private async expectCountChange(entity: Entity, before: number): Promise<number> {
    await expect.poll(() => this.total(entity), { timeout: 30_000 }).not.toBe(before);
    await this.results.waitForLoaded();
    return this.total(entity);
  }

  async keywordSearch(term: string, entity: Entity = 'companies'): Promise<number> {
    const before = await this.total(entity);
    await this.results.headerSearch(entity === 'companies' ? /Search by Company name/ : /Search by People name/, term);
    return this.expectCountChange(entity, before);
  }

  async aiSearch(prompt: string): Promise<void> {
    const before = await this.total('companies');
    await this.aiSearchInput.fill(prompt);
    await this.aiSearchInput.press('Enter');
    await this.expectCountChange('companies', before);
  }

  async applyFilter(filter: string, key: string, value: string, entity: Entity = 'companies'): Promise<number> {
    const before = await this.total(entity);
    await this.filters.include(filter, key, value);
    return this.expectCountChange(entity, before);
  }

  async clearFilters(entity: Entity = 'companies'): Promise<number> {
    const before = await this.total(entity);
    await this.filters.clearAllButton.click();
    return this.expectCountChange(entity, before);
  }

  async previewRow(index: number): Promise<string> {
    const name = await this.results.openPreview(index);
    await this.sidePanel.expectOpenFor(name);
    return name;
  }

  /** Popover: "Search or create a new list". Picks an existing list by name. */
  async addSelectedToList(listName: string): Promise<void> {
    await this.addToListButton.click();
    const box = this.page.getByPlaceholder('Search or create a new list');
    await box.fill(listName);
    await this.page.getByText(listName, { exact: true }).last().click();
    const confirm = this.page.getByRole('button', { name: /^(add|save|done|confirm)$/i }).last();
    await expect(confirm.or(this.page.getByText(/added|saved/i).first())).toBeVisible();
    if (await confirm.isVisible()) await confirm.click();
    await expect(this.page.getByText(/added|saved/i).first()).toBeVisible();
  }

  /** "Export as XLSX" dialog. Tech Intelligence is unticked so we only spend 1 credit per record. */
  async exportSelected(): Promise<{ recordCount: number }> {
    await this.downloadButton.click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Export as XLSX' });
    await expect(dialog).toBeVisible();
    const recordCount = Number((await dialog.innerText()).match(/export (\d+) record/i)?.[1]);
    const techIntel = dialog.getByRole('checkbox', { name: /Include Tech Intelligence/i });
    if (await techIntel.isChecked()) await techIntel.uncheck();
    await expect(techIntel).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Export' }).click();
    await expect(dialog).toBeHidden();
    return { recordCount };
  }

  async downloadFromCentre(): Promise<{ download: Download; row: Locator }> {
    await this.page.goto(routes.downloadCenter);
    const newest = this.page.locator('table tbody tr').first();
    await expect
      .poll(
        async () => {
          await this.page.reload();
          return (await newest.innerText().catch(() => '')).toLowerCase();
        },
        { timeout: 120_000, intervals: [5_000, 10_000], message: 'export should complete in the Download Centre' },
      )
      .toMatch(/complete|ready|success|done/);
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      newest.getByRole('button').or(newest.getByRole('link')).last().click(),
    ]);
    return { download, row: newest };
  }
}
