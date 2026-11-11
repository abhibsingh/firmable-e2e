import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ResultsTable } from '../components/ResultsTable';
import { routes, urlPatterns } from '../config/routes';
import { parseTabCount } from '../utils/text';


/**
 * Lists: /dashboard/list and /dashboard/list/<uuid>.
 * Hooks: [data-elements=create-list], list links [data-elements="<list name>"],
 * header menu [data-elements=list-action-more] with rename-list / delete-list.
 */
export class ListsPage extends BasePage {
  readonly path = routes.lists;
  readonly createButton: Locator;
  readonly privateTab: Locator;
  readonly sharedTab: Locator;
  readonly records: ResultsTable;
  readonly dialog: Locator;
  readonly nameInput: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.locator('[data-elements="create-list"]').first();
    this.privateTab = page.getByRole('tab', { name: 'Private', exact: true });
    this.sharedTab = page.getByRole('tab', { name: 'Shared', exact: true });
    this.records = new ResultsTable(page);
    this.dialog = page.getByRole('dialog');
    this.nameInput = this.dialog.getByRole('textbox', { name: 'List name' });
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.createButton).toBeVisible({ timeout: 30_000 });
  }

  /** A list card in the left "Lists" panel, found by its visible name. */
  link(name: string): Locator {
    return this.page.getByRole('complementary', { name: 'Lists' }).getByText(name, { exact: true });
  }

  toast(text: RegExp): Locator {
    return this.page.getByText(text).first();
  }

  private async typeName(name: string): Promise<void> {
    await expect(this.dialog.getByRole('heading', { name: 'Create new list' })).toBeVisible();
    // real keystrokes, so the dialog's form state sees the value and not just the DOM
    await expect(async () => {
      await this.nameInput.clear();
      await this.nameInput.pressSequentially(name, { delay: 10 });
      await expect(this.nameInput).toHaveValue(name, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Success is anchored on the create API call, not the toast. Afterwards the page refetches lists and
   * Firmable reopens an empty "Create new list" dialog (finding F5), which hides the rest of the page
   * from the accessibility tree, so it is closed before continuing.
   */
  async create(name: string, shared = false): Promise<void> {
    await this.createButton.click();
    await this.typeName(name);
    if (shared) await this.dialog.locator('[data-elements="switch-list-type"]').click();

    const createCall = this.page.waitForResponse((r) => r.url().includes('/internal/list/new') && r.request().method() === 'POST');
    const refetch = this.page.waitForResponse((r) => /\/internal\/list(\?|$)/.test(r.url()) && r.request().method() === 'GET', { timeout: 20_000 });
    await this.dialog.getByRole('button', { name: 'Create', exact: true }).click();
    expect((await createCall).ok(), 'create list API call').toBe(true);
    await refetch.catch(() => undefined);
    await this.dismissReopenedDialog();

    // the panel can show the new card before its name loads, so check on a fresh load
    await this.goto();
    await (shared ? this.sharedTab : this.privateTab).click();
    await expect(this.link(name)).toBeVisible({ timeout: 20_000 });
  }

  private async dismissReopenedDialog(): Promise<void> {
    const createBtn = this.dialog.getByRole('button', { name: 'Create', exact: true });
    const reopened = await createBtn.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
    if (reopened) {
      await this.dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(createBtn).toBeHidden();
    }
  }

  async attemptCreate(name: string): Promise<void> {
    await this.createButton.click();
    await this.typeName(name);
    const create = this.dialog.getByRole('button', { name: 'Create', exact: true });
    if (await create.isEnabled()) await create.click();
  }

  /** The panel loads its cards after the tab switch, so give each tab a moment before moving on. */
  private async findInTabs(name: string): Promise<boolean> {
    for (const tab of [this.privateTab, this.sharedTab]) {
      await tab.click();
      const found = await this.link(name).waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false);
      if (found) return true;
    }
    return false;
  }

  async open(name: string): Promise<void> {
    expect(await this.findInTabs(name), `list "${name}" in Private or Shared`).toBe(true);
    await this.link(name).click();
    await expect(this.page).toHaveURL(urlPatterns.listDetail);
    await this.records.waitForLoaded();
  }

  async companyCount(): Promise<number> {
    return parseTabCount(await this.page.getByRole('tab', { name: /^Companies \(\d+\)$/ }).innerText());
  }

  /** The list page refetches right after opening, which can re-render the open menu, so retry as a unit. */
  private async menu(item: 'rename-list' | 'delete-list'): Promise<void> {
    await expect(async () => {
      if (!(await this.page.locator(`[data-elements="${item}"]`).isVisible())) {
        await this.page.locator('[data-elements="list-action-more"]').first().click();
      }
      await this.page.locator(`[data-elements="${item}"]`).click({ timeout: 3_000 });
      await expect(this.dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  async rename(oldName: string, newName: string): Promise<void> {
    await this.open(oldName);
    await this.menu('rename-list');
    const input = this.dialog.getByRole('textbox').first();
    await expect(async () => {
      await input.fill(newName);
      await expect(input).toHaveValue(newName, { timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await this.dialog.getByRole('button', { name: /^(save|rename|update)$/i }).click();
    await expect(this.link(newName)).toBeVisible();
  }

  async delete(name: string): Promise<void> {
    await this.open(name);
    await this.menu('delete-list');
    await expect(this.dialog).toContainText(name);
    await this.dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(this.link(name)).toHaveCount(0, { timeout: 20_000 });
  }

  async deleteIfExists(name: string): Promise<void> {
    await this.goto();
    if (await this.findInTabs(name)) await this.delete(name);
  }

  /** Select records on the list detail page and remove them via the toolbar "List actions" menu. */
  async removeRecords(names: string[]): Promise<void> {
    for (const n of names) await this.records.rowByName(n).getByRole('checkbox').first().check();
    await this.page.getByRole('button', { name: /^List actions/ }).click();
    await this.page.getByRole('menuitem', { name: /remove/i }).or(this.page.getByRole('button', { name: /remove/i })).first().click();
    const confirm = this.dialog.getByRole('button', { name: /^(remove|confirm|yes|delete)/i });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    for (const n of names) await expect(this.records.rowByName(n)).toHaveCount(0);
  }
}
