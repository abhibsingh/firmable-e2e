import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Left "Filters" panel. Filter items ("Industry", "Location (Company)") are clickable divs, not buttons.
 * Opening one shows a search box [data-inputs="core-filters"] and option rows:
 *   button[data-elements="core-filters-option"][data-ph-capture-attribute-select-filter-option="<key>:<value>"]
 * with a "+" button next to each option that includes it.
 */
export class FilterPanel {
  readonly appliedButton: Locator;
  readonly clearAllButton: Locator;
  readonly appliedTags: Locator;
  readonly searchBox: Locator;

  constructor(private readonly page: Page) {
    this.appliedButton = page.getByRole('button', { name: /^Applied \(\d+\)$/ });
    this.clearAllButton = page.getByRole('button', { name: 'Clear all' }).or(page.getByText('Clear all', { exact: true })).first();
    this.appliedTags = page.locator('[data-elements="core-filters-tag-remove"]');
    this.searchBox = page.locator('[data-inputs="core-filters"]:visible').last();
  }

  async appliedCount(): Promise<number> {
    const text = await this.appliedButton.innerText();
    return Number(text.match(/\((\d+)\)/)?.[1] ?? Number.NaN);
  }

  /** The filter item in the left panel, ignoring the table header with the same text. */
  item(filter: string): Locator {
    return this.page
      .locator(`xpath=//*[normalize-space(.)="${filter}" and not(ancestor::table) and not(*[normalize-space(.)="${filter}"])]`)
      .first();
  }

  async open(filter: string): Promise<void> {
    await this.item(filter).click();
    await expect(this.searchBox).toBeVisible();
  }

  async close(): Promise<void> {
    const close = this.page.getByRole('button', { name: 'Close' }).last();
    if (await close.isVisible()) await close.click();
    else await this.page.keyboard.press('Escape');
    await expect(this.searchBox).toBeHidden();
  }

  option(key: string, value: string): Locator {
    return this.page.locator(
      `button[data-elements="core-filters-option"][data-ph-capture-attribute-select-filter-option="${key}:${value}"]`,
    );
  }

  async include(filter: string, key: string, value: string): Promise<void> {
    await this.open(filter);
    await this.searchBox.fill(value);
    const option = this.option(key, value);
    await expect(option).toBeVisible();
    await option.locator('xpath=..').getByRole('button').last().click();
    await expect(this.appliedButton).not.toHaveText('Applied (0)');
    await this.close();
  }
}
