import { test, expect } from '../../src/fixtures/test';

test.describe('Lists', () => {
  test('create, rename and delete a private list', { tag: ['@smoke', '@lists'] }, async ({ listsPage, cleanup, uniqueName }) => {
    const name = uniqueName('list');
    const renamed = `${name}-renamed`;
    cleanup.add(`delete ${name}`, () => listsPage.deleteIfExists(name));
    cleanup.add(`delete ${renamed}`, () => listsPage.deleteIfExists(renamed));

    await listsPage.goto();
    await test.step('create', () => listsPage.create(name));
    await test.step('new list is empty', async () => {
      await listsPage.open(name);
      expect(await listsPage.companyCount()).toBe(0);
    });
    await test.step('rename', async () => {
      await listsPage.rename(name, renamed);
      await expect(listsPage.link(name)).toHaveCount(0);
    });
    await test.step('delete', () => listsPage.delete(renamed));
  });

  test('shared list appears under the Shared tab', { tag: ['@regression', '@lists'] }, async ({ listsPage, cleanup, uniqueName }) => {
    const name = uniqueName('shared');
    cleanup.add(`delete ${name}`, () => listsPage.deleteIfExists(name));

    await listsPage.goto();
    await listsPage.create(name, true);
    await listsPage.privateTab.click();
    await expect(listsPage.link(name)).toHaveCount(0);
  });

  test('companies selected in search are added to a list', { tag: ['@smoke', '@lists'] }, async ({ searchPage, listsPage, list }) => {
    await searchPage.open('companies');
    const picked = await searchPage.results.selectRows(2);
    await searchPage.addSelectedToList(list.name);

    await listsPage.goto();
    await listsPage.open(list.name);
    expect(await listsPage.companyCount()).toBe(2);
    for (const name of picked) await expect(listsPage.records.rowByName(name)).toHaveCount(1);
  });

  test('empty list name cannot be created', { tag: ['@regression', '@lists', '@negative'] }, async ({ listsPage }) => {
    await listsPage.goto();
    await listsPage.attemptCreate('   ');
    await expect(listsPage.dialog).toBeVisible();
    await expect(listsPage.dialog.getByRole('button', { name: 'Create', exact: true })).toBeVisible();
    await listsPage.dialog.getByRole('button', { name: 'Cancel' }).click();
  });
});
