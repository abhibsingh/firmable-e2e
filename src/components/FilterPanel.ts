import { expect, type Locator, type Page } from '@playwright/test';

export class FilterPanel {
  readonly root: Locator;
  readonly appliedChips: Locator;
  readonly clearAllButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page
      .getByTestId('search-filters')
      .or(page.getByRole('complementary').filter({ hasText: /filter/i }))
      .or(page.locator('aside').filter({ hasText: /filter/i }))
      .first();
    this.appliedChips = page.getByTestId('applied-filter').or(page.locator('[data-applied-filter]'));
    this.clearAllButton = page.getByRole('button', { name: /clear( all)?( filters)?|reset/i }).first();
  }

  section(filterName: string): Locator {
    return this.root
      .getByRole('button', { name: new RegExp(`^${filterName}`, 'i') })
      .or(this.root.getByText(new RegExp(`^${filterName}$`, 'i')))
      .first();
  }

  async select(filterName: string, value: string): Promise<void> {
    await this.section(filterName).click();
    const searchBox = this.root.getByRole('combobox').or(this.root.getByRole('searchbox')).or(this.root.getByPlaceholder(/search/i));
    if (await searchBox.first().isVisible()) await searchBox.first().fill(value);

    const option = this.page
      .getByRole('option', { name: new RegExp(value, 'i') })
      .or(this.root.getByRole('checkbox', { name: new RegExp(value, 'i') }))
      .or(this.root.getByLabel(new RegExp(value, 'i')))
      .first();
    await expect(option).toBeVisible();
    await option.click();
  }

  async expectApplied(value: string): Promise<void> {
    await expect(
      this.page.getByTestId('applied-filter').filter({ hasText: new RegExp(value, 'i') })
        .or(this.page.getByRole('button', { name: new RegExp(`remove ${value}|${value}.*(x|remove)`, 'i') }))
        .or(this.root.getByRole('checkbox', { name: new RegExp(value, 'i'), checked: true }))
        .first(),
    ).toBeVisible();
  }
}
