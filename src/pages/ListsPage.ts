import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ResultsTable } from '../components/ResultsTable';
import { routes, urlPatterns } from '../config/routes';
import { parseTabCount } from '../utils/text';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    this.privateTab = page.getByRole('button', { name: 'Private', exact: true });
    this.sharedTab = page.getByRole('button', { name: 'Shared', exact: true });
    this.records = new ResultsTable(page);
    this.dialog = page.getByRole('dialog');
    this.nameInput = this.dialog.getByRole('textbox', { name: 'List name' });
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.createButton).toBeVisible({ timeout: 30_000 });
  }

  link(name: string): Locator {
    return this.page.locator(`a[data-elements="${name}"]`);
  }

  toast(text: RegExp): Locator {
    return this.page.getByText(text).first();
  }

  async create(name: string, shared = false): Promise<void> {
    await this.createButton.click();
    await this.nameInput.fill(name);
    if (shared) await this.dialog.locator('[data-elements="switch-list-type"]').click();
    await this.dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(this.toast(new RegExp(`${escapeRe(name)}.{0,2} was successfully created`))).toBeVisible();
    await (shared ? this.sharedTab : this.privateTab).click();
    await expect(this.link(name)).toBeVisible();
  }

  async attemptCreate(name: string): Promise<void> {
    await this.createButton.click();
    await this.nameInput.fill(name);
    const create = this.dialog.getByRole('button', { name: 'Create', exact: true });
    if (await create.isEnabled()) await create.click();
  }

  async open(name: string): Promise<void> {
    for (const tab of [this.privateTab, this.sharedTab]) {
      await tab.click();
      if (await this.link(name).isVisible()) break;
    }
    await this.link(name).click();
    await expect(this.page).toHaveURL(urlPatterns.listDetail);
    await this.records.waitForLoaded();
  }

  async companyCount(): Promise<number> {
    return parseTabCount(await this.page.getByRole('button', { name: /^Companies \(\d+\)$/ }).innerText());
  }

  private async menu(item: 'rename-list' | 'delete-list'): Promise<void> {
    await this.page.locator('[data-elements="list-action-more"]').first().click();
    await this.page.locator(`[data-elements="${item}"]`).click();
  }

  async rename(oldName: string, newName: string): Promise<void> {
    await this.open(oldName);
    await this.menu('rename-list');
    const input = this.dialog.getByRole('textbox').first();
    await input.fill(newName);
    await this.dialog.getByRole('button', { name: /^(save|rename|update)$/i }).click();
    await expect(this.link(newName)).toBeVisible();
  }

  async delete(name: string): Promise<void> {
    await this.open(name);
    await this.menu('delete-list');
    await expect(this.dialog).toContainText(name);
    await this.dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(this.toast(new RegExp(`${escapeRe(name)}.{0,2} was successfully deleted`))).toBeVisible();
    await expect(this.link(name)).toHaveCount(0);
  }

  async deleteIfExists(name: string): Promise<void> {
    await this.goto();
    for (const tab of [this.privateTab, this.sharedTab]) {
      await tab.click();
      if (await this.link(name).isVisible()) {
        await this.delete(name);
        return;
      }
    }
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
