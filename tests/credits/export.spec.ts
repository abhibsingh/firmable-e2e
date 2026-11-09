import { test, expect } from '../../src/fixtures/test';
import { env } from '../../src/config/env';
import { readXlsx, findHeader } from '../../src/utils/xlsx';
import { searchData } from '../../src/data/searchData';

// Exports 2 companies with Tech Intelligence unticked, so about 2 credits per run.
test.describe('Export (spends credits)', () => {
  test('exported XLSX matches the selected companies and credits are deducted', { tag: ['@regression', '@credits'] }, async ({
    searchPage,
    credits,
    creditGuard,
  }, testInfo) => {
    const records = env.maxCreditRecords;

    await searchPage.open('companies');
    await searchPage.keywordSearch(searchData.companies.keyword);
    const picked = await searchPage.results.selectRows(records);

    const { recordCount } = await test.step('export from the dialog', () => searchPage.exportSelected());
    expect(recordCount).toBe(records);

    const { download } = await test.step('download from the Download Centre', () => searchPage.downloadFromCentre());
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const file = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(file);
    await testInfo.attach('export.xlsx', { path: file });

    await test.step('file content matches what was selected', async () => {
      const { headers, records: rows } = await readXlsx(file);
      expect(rows).toHaveLength(records);
      const nameCol = findHeader(headers, /company name|^name$/i);
      expect(nameCol, `name column in ${headers.join(', ')}`).toBeTruthy();
      const exported = rows.map((r) => r[nameCol!].toLowerCase());
      for (const name of picked) expect(exported).toContain(name.toLowerCase());
    });

    await test.step('credits deducted by at most 1 per record', async () => {
      const after = await credits.waitForSpend(creditGuard.before, 60_000);
      const spent = creditGuard.before.remaining - after.remaining;
      testInfo.annotations.push({ type: 'credits-spent', description: String(spent) });
      expect(spent).toBeGreaterThan(0);
      expect(spent).toBeLessThanOrEqual(records);
    });
  });

  test('download is blocked when nothing is selected', { tag: ['@regression', '@credits', '@negative'] }, async ({ searchPage }) => {
    await searchPage.open('companies');
    await expect(searchPage.downloadButton).toHaveAttribute('aria-disabled', 'true');
    await expect(searchPage.addToListButton).toBeDisabled();
  });
});
