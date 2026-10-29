import * as path from 'path';
import { test, expect } from '../../src/fixtures/test';
import { searchData } from '../../src/data/searchData';
import { env } from '../../src/config/env';
import { readCsvFile, findHeader } from '../../src/utils/csv';

test.describe.configure({ mode: 'serial' });

test.describe('Export', () => {
  test.beforeEach(async ({ searchPage }) => {
    await searchPage.open('companies');
    await searchPage.keywordSearch(searchData.companies.keyword);
  });

  test('exporting selected companies produces a correct CSV', { tag: ['@smoke', '@export', '@credits'] }, async ({
    creditGuard,
    searchPage,
    appShell,
  }, testInfo) => {
    const n = env.maxCreditRecords;
    const selected = await searchPage.results.selectRows(n);

    const download = await searchPage.exportSelected();
    const filePath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(filePath);
    await testInfo.attach('export', { path: filePath });

    await test.step('file format', async () => {
      expect(path.extname(filePath).toLowerCase(), 'export should be CSV').toBe('.csv');
      expect(download.suggestedFilename()).not.toMatch(/undefined|null/i);
    });

    const { headers, records } = readCsvFile(filePath);

    await test.step('headers', async () => {
      const nameHeader = findHeader(headers, /^(company )?name$/i);
      expect(nameHeader, `name column missing. Headers: ${headers.join(', ')}`).toBeDefined();
      for (const wanted of [/domain|website/i, /industry/i]) {
        expect.soft(findHeader(headers, wanted), `header ${wanted} missing`).toBeDefined();
      }
    });

    await test.step('rows match the selection exactly', async () => {
      expect(records).toHaveLength(n);
      const nameHeader = findHeader(headers, /^(company )?name$/i)!;
      const exportedNames = records.map((r) => r[nameHeader]).sort();
      expect(exportedNames).toEqual([...selected].sort());
    });

    await test.step('no empty or corrupted cells in key columns', async () => {
      const nameHeader = findHeader(headers, /^(company )?name$/i)!;
      for (const r of records) {
        expect(r[nameHeader]).not.toBe('');
        expect(Object.values(r).join('')).not.toMatch(/\[object Object\]|undefined|NaN/);
      }
    });

    await test.step('credits never INCREASE because of an export', async () => {
      const after = await appShell.credits.read();
      expect(after).toBeLessThanOrEqual(creditGuard.balanceBefore);
      testInfo.annotations.push({ type: 'export-credits-spent', description: String(creditGuard.balanceBefore - after) });
    });
  });

  test('export is unavailable with nothing selected', { tag: ['@regression', '@export', '@negative'] }, async ({ page, searchPage }) => {
    await expect(searchPage.results.selectedCount).toBeHidden();
    let downloaded = false;
    page.on('download', () => (downloaded = true));
    if (await searchPage.exportButton.isEnabled()) {
      await searchPage.exportButton.click();
      await expect(page.getByText(/select (at least )?(one|1|records)|no records selected/i).first()).toBeVisible();
    } else {
      await expect(searchPage.exportButton).toBeDisabled();
    }
    expect(downloaded).toBe(false);
  });
});
