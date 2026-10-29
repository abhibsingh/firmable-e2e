import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';

test.describe('Lists', () => {
  test('full lifecycle: create, add, rename, remove records, delete', { tag: ['@smoke', '@lists'] }, async ({
    listsPage,
    searchPage,
    uniqueName,
    cleanup,
  }) => {
    let name = uniqueName('list');
    const renamed = `${name}-renamed`;
    // registered before any step so a mid test failure still cleans up
    cleanup.add(`delete ${name} / ${renamed}`, async () => {
      await listsPage.deleteIfExists(renamed);
      await listsPage.deleteIfExists(name);
    });

    await test.step('create', async () => {
      await listsPage.goto();
      await listsPage.create(name, 'Companies');
      await expect(listsPage.row(name)).toBeVisible();
    });

    let added: string[] = [];
    await test.step('add 2 records from search', async () => {
      await searchPage.open('companies');
      await searchPage.keywordSearch(searchData.companies.keyword);
      added = await searchPage.results.selectRows(2);
      await searchPage.addSelectedToList(name);
    });

    await test.step('list contains exactly the added records', async () => {
      await listsPage.goto();
      await expect.soft(listsPage.row(name)).toContainText(/\b2\s*(records?|compan|items?|contacts?)/i);
      await listsPage.open(name);
      await expect(listsPage.records.rows).toHaveCount(2);
      for (const record of added) await expect(listsPage.records.rowByName(record)).toBeVisible();
    });

    await test.step('rename', async () => {
      await listsPage.goto();
      await listsPage.rename(name, renamed);
      await expect(listsPage.row(name).filter({ hasNotText: 'renamed' })).toHaveCount(0);
      name = renamed;
    });

    await test.step('remove one record', async () => {
      await listsPage.open(name);
      await listsPage.removeRecords([added[0]]);
      await expect(listsPage.records.rows).toHaveCount(1);
      await expect(listsPage.records.rowByName(added[1])).toBeVisible();
    });

    await test.step('delete', async () => {
      await listsPage.goto();
      await listsPage.delete(name);
    });
  });

  test('adding the same record twice does not duplicate it', { tag: ['@regression', '@lists', '@negative'] }, async ({
    list,
    listsPage,
    searchPage,
  }) => {
    await searchPage.open('companies');
    await searchPage.keywordSearch(searchData.companies.keyword);
    const [record] = await searchPage.results.selectRows(1);
    await searchPage.addSelectedToList(list.name);
    await searchPage.results.selectRows(1);
    await searchPage.addSelectedToList(list.name);

    await listsPage.goto();
    await listsPage.open(list.name);
    await expect(listsPage.records.rowByName(record)).toHaveCount(1);
  });

  test('empty list name is rejected', { tag: ['@regression', '@lists', '@negative'] }, async ({ page, listsPage }) => {
    await listsPage.goto();
    await listsPage.attemptCreate('   ');
    const submit = page.getByRole('dialog').getByRole('button', { name: /^(create|save)$/i });
    await expect(submit.and(page.locator(':disabled')).or(listsPage.nameError).first()).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('duplicate list name is handled', { tag: ['@regression', '@lists', '@negative'] }, async ({ list, listsPage, page }) => {
    await listsPage.attemptCreate(list.name);
    const error = listsPage.nameError.or(page.getByRole('dialog').getByText(/already exists/i)).first();
    const result = await Promise.race([
      error.waitFor({ state: 'visible' }).then(() => 'validation' as const),
      page.getByRole('dialog').waitFor({ state: 'hidden' }).then(() => 'accepted' as const),
    ]);
    test.info().annotations.push({ type: 'duplicate-name-behaviour', description: result });
    if (result === 'validation') {
      await expect(page.getByRole('dialog')).toBeVisible();
    } else {
      await listsPage.goto();
      await expect(listsPage.listRows.filter({ hasText: new RegExp(`^\\s*${list.name}\\s*$`) })).toHaveCount(1);
    }
  });

  test('very long list name is limited or truncated gracefully', { tag: ['@regression', '@lists', '@negative'] }, async ({ listsPage, uniqueName, cleanup, page }) => {
    const longName = `${uniqueName('list')}-${'x'.repeat(300)}`;
    cleanup.add('delete long list', () => listsPage.deleteIfExists(longName.slice(0, 40)));
    await listsPage.goto();
    await listsPage.attemptCreate(longName);
    await expect(listsPage.nameError.or(page.getByRole('dialog')).or(listsPage.row(longName.slice(0, 40))).first()).toBeVisible();
    await expect(page.getByText(/something went wrong|500/i)).toHaveCount(0);
  });
});
