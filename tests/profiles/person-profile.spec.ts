import { test } from '../../src/fixtures/test';

test.describe('Person profile', () => {
  test('full view from the quick view matches the selected person', { tag: ['@smoke', '@profile'] }, async ({ searchPage, personProfile }) => {
    await searchPage.open('people');
    const name = await searchPage.previewRow(0);
    await searchPage.sidePanel.openFullView();
    await personProfile.expectProfileOf(name);
  });
});
