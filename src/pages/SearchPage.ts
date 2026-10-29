import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { FilterPanel } from '../components/FilterPanel';
import { ResultsTable } from '../components/ResultsTable';
import { SidePanel } from '../components/SidePanel';
import { AppShell } from '../components/AppShell';
import { api, routes } from '../config/routes';

export type Entity = 'companies' | 'people';

export class SearchPage extends BasePage {
  readonly path = routes.search;

  readonly shell: AppShell;
  readonly filters: FilterPanel;
  readonly results: ResultsTable;
  readonly sidePanel: SidePanel;

  readonly keywordInput: Locator;
  readonly aiSearchToggle: Locator;
  readonly aiSearchInput: Locator;
  readonly addToListButton: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    super(page);
    this.shell = new AppShell(page);
    this.filters = new FilterPanel(page);
    this.results = new ResultsTable(page);
    this.sidePanel = new SidePanel(page);

    this.keywordInput = page
      .getByTestId('keyword-search')
      .or(page.getByRole('searchbox'))
      .or(page.getByPlaceholder(/search (by )?(keyword|companies|people|name)/i))
      .first();
    this.aiSearchToggle = page.getByRole('tab', { name: /ai search/i }).or(page.getByRole('button', { name: /ai search/i })).first();
    this.aiSearchInput = page.getByPlaceholder(/describe|ask|who are you looking for/i).or(page.getByTestId('ai-search-input')).first();
    this.addToListButton = page.getByRole('button', { name: /add to list|save to list/i }).first();
    this.exportButton = page.getByRole('button', { name: /export|download/i }).first();
  }

  async waitUntilReady(): Promise<void> {
    await this.shell.expectSignedIn();
    await this.results.waitForLoaded();
  }

  async open(entity: Entity): Promise<void> {
    await this.page.goto(entity === 'companies' ? routes.companiesSearch : routes.peopleSearch);
    await this.waitUntilReady();
  }

  private async runSearch(action: () => Promise<unknown>): Promise<void> {
    await this.actAndWaitForResponse(api.search, action);
    await this.results.waitForLoaded();
  }

  async keywordSearch(term: string): Promise<void> {
    await this.runSearch(async () => {
      await this.keywordInput.fill(term);
      await this.keywordInput.press('Enter');
    });
  }

  async aiSearch(prompt: string): Promise<void> {
    await this.aiSearchToggle.click();
    await this.runSearch(async () => {
      await this.aiSearchInput.fill(prompt);
      await this.aiSearchInput.press('Enter');
    });
  }

  async applyFilter(filterName: string, value: string): Promise<void> {
    await this.runSearch(() => this.filters.select(filterName, value));
    await this.filters.expectApplied(value);
  }

  async clearFilters(): Promise<void> {
    await this.runSearch(() => this.filters.clearAllButton.click());
  }

  async previewRow(index: number): Promise<string> {
    const name = await this.results.openPreview(index);
    await this.sidePanel.expectOpenFor(name);
    return name;
  }

  async addSelectedToList(listName: string): Promise<void> {
    await this.addToListButton.click();
    const dialog = this.page.getByRole('dialog').last();
    const listOption = dialog
      .getByRole('option', { name: listName })
      .or(dialog.getByRole('checkbox', { name: listName }))
      .or(dialog.getByText(listName, { exact: true }))
      .first();
    const search = dialog.getByRole('combobox').or(dialog.getByPlaceholder(/search lists?/i)).first();
    if (await search.isVisible()) await search.fill(listName);
    const confirm = dialog.getByRole('button', { name: /^(add|save|done|confirm)$/i }).first();
    await this.clickWithOptionalConfirm(listOption, confirm, api.lists, { nonGetOnly: true });
    await expect(this.toast(/added|saved/i).first()).toBeVisible();
  }

  async exportSelected(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await this.exportButton.click();
    const confirm = this.page.getByRole('dialog').getByRole('button', { name: /^(export|download|confirm)/i }).first();
    const first = await Promise.race([
      downloadPromise.then(() => 'download' as const),
      confirm.waitFor({ state: 'visible' }).then(() => 'dialog' as const),
    ]);
    if (first === 'dialog') {
      const csvChoice = this.page.getByRole('dialog').getByRole('radio', { name: /csv/i }).first();
      if (await csvChoice.isVisible()) await csvChoice.check();
      await confirm.click();
    }
    return downloadPromise;
  }
}
