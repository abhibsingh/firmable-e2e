import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ResultsTable } from '../components/ResultsTable';
import { api, routes } from '../config/routes';

export class ListsPage extends BasePage {
  readonly path = routes.lists;
  readonly createButton: Locator;
  readonly nameInput: Locator;
  readonly listRows: Locator;
  readonly records: ResultsTable;
  readonly nameError: Locator;

  constructor(page: Page) {
    super(page);
    this.createButton = page.getByRole('button', { name: /(create|new) list/i }).first();
    this.nameInput = page.getByRole('dialog').getByRole('textbox').first();
    this.listRows = page.getByTestId('list-row').or(page.getByRole('row')).or(page.getByRole('listitem'));
    this.records = new ResultsTable(page);
    this.nameError = page
      .getByRole('dialog')
      .locator('[role="alert"], [id$="error"], .error, [aria-invalid="true"] ~ *')
      .or(page.getByRole('dialog').getByText(/required|already exists|too long|invalid/i))
      .first();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.createButton).toBeVisible();
    await this.waitForNoLoaders();
  }

  row(name: string): Locator {
    return this.listRows.filter({ hasText: name }).first();
  }

  private dialogButton(name: RegExp): Locator {
    return this.page.getByRole('dialog').getByRole('button', { name }).first();
  }

  async create(name: string, type: 'Companies' | 'People' = 'Companies'): Promise<void> {
    await this.createButton.click();
    await this.nameInput.fill(name);
    const typeChoice = this.page.getByRole('dialog').getByRole('radio', { name: new RegExp(type, 'i') }).first();
    if (await typeChoice.isVisible()) await typeChoice.check();
    await this.actAndWaitForResponse(api.lists, () => this.dialogButton(/^(create|save)$/i).click(), { method: 'POST' });
    await expect(this.page.getByRole('dialog')).toBeHidden();
  }

  async attemptCreate(name: string): Promise<void> {
    await this.createButton.click();
    await this.nameInput.fill(name);
    const submit = this.dialogButton(/^(create|save)$/i);
    if (await submit.isEnabled()) await submit.click();
  }

  async openRowMenu(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: /more|actions|options|menu/i }).first().click();
  }

  async rename(oldName: string, newName: string): Promise<void> {
    await this.openRowMenu(oldName);
    await this.page.getByRole('menuitem', { name: /rename|edit/i }).click();
    await this.nameInput.fill(newName);
    await this.actAndWaitForResponse(api.lists, () => this.dialogButton(/^(save|rename|update)$/i).click());
    await expect(this.row(newName)).toBeVisible();
  }

  async delete(name: string): Promise<void> {
    await this.openRowMenu(name);
    await this.page.getByRole('menuitem', { name: /delete/i }).click();
    await this.actAndWaitForResponse(api.lists, () => this.dialogButton(/^(delete|confirm|yes)/i).click(), { method: 'DELETE' });
    await expect(this.row(name)).toHaveCount(0);
  }

  async deleteIfExists(name: string): Promise<void> {
    await this.goto();
    if ((await this.row(name).count()) === 0) return;
    await this.delete(name);
  }

  async open(name: string): Promise<void> {
    await this.row(name).getByRole('link').or(this.row(name)).first().click();
    await expect(this.page.getByRole('heading', { name })).toBeVisible();
    await this.records.waitForLoaded();
  }

  async removeRecords(names: string[]): Promise<void> {
    for (const n of names) await this.records.rowByName(n).getByRole('checkbox').first().check();
    await this.clickWithOptionalConfirm(
      this.page.getByRole('button', { name: /remove( from list)?|delete/i }).first(),
      this.dialogButton(/^(remove|confirm|yes|delete)/i),
      api.lists,
      { nonGetOnly: true },
    );
    for (const n of names) await expect(this.records.rowByName(n)).toHaveCount(0);
  }
}
