import { test } from '../../src/fixtures/test';

test.describe('Person profile', () => {
  test('full view matches the selected person', { tag: ['@smoke', '@profile'] }, async ({ searchPage, personProfile }) => {
    await searchPage.open('people');
    const name = await searchPage.openPerson(0);
    if (await searchPage.sidePanel.fullViewLink.isVisible()) await searchPage.sidePanel.openFullView();
    await personProfile.expectProfileOf(name);
  });
});
