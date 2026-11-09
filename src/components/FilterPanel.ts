import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Left hand "Filters" panel. Each filter opens a sub panel with a combobox
 * (aria-label "Search <Filter>") and option rows:
 *   button[data-elements="core-filters-option"][data-ph-capture-attribute-select-filter-option="<key>:<value>"]
 * with a "+" button next to each option that includes it.
 */
export class FilterPanel {
  readonly appliedButton: Locator;
  readonly clearAllButton: Locator;
  readonly appliedTags: Locator;

  constructor(private readonly page: Page) {
    this.appliedButton = page.getByRole('button', { name: /^Applied \(\d+\)$/ });
    this.clearAllButton = page.getByRole('button', { name: 'Clear all' });
    this.appliedTags = page.locator('[data-elements="core-filters-tag-remove"]');
  }

  async appliedCount(): Promise<number> {
    const text = await this.appliedButton.innerText();
    return Number(text.match(/\((\d+)\)/)?.[1] ?? Number.NaN);
  }

  private panelHeading(filter: string): Locator {
    return this.page.getByRole('heading', { name: filter, exact: true });
  }

  async open(filter: string): Promise<void> {
    await this.page.getByRole('button', { name: filter, exact: true }).first().click();
    await expect(this.panelHeading(filter)).toBeVisible();
  }

  async close(filter: string): Promise<void> {
    const panel = this.page.locator('div', { has: this.panelHeading(filter) }).filter({ has: this.page.getByRole('button', { name: 'Close' }) }).last();
    await panel.getByRole('button', { name: 'Close' }).first().click();
    await expect(this.panelHeading(filter)).toBeHidden();
  }

  option(key: string, value: string): Locator {
    return this.page.locator(
      `button[data-elements="core-filters-option"][data-ph-capture-attribute-select-filter-option="${key}:${value}"]`,
    );
  }

  /** Opens the filter, searches for the value and includes it. */
  async include(filter: string, key: string, value: string): Promise<void> {
    await this.open(filter);
    const panel = this.page.locator('div', { has: this.panelHeading(filter) }).filter({ has: this.page.getByRole('combobox') }).last();
    await panel.getByRole('combobox').last().fill(value);
    const option = this.option(key, value);
    await expect(option).toBeVisible();
    await option.locator('xpath=..').getByRole('button').last().click();
    await this.close(filter);
  }
}
