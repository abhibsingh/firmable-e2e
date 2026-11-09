import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readXlsx, findHeader } from '../../src/utils/xlsx';
import { parseCount, parseTabCount, MASKED_REGEX, EMAIL_REGEX } from '../../src/utils/text';
import { uniqueName, clerkTestEmail } from '../../src/data/testData';

test.describe('utils', { tag: ['@unit', '@smoke'] }, () => {
  test('readXlsx returns headers and records from the first sheet', async ({}, testInfo) => {
    const file = testInfo.outputPath('sample.xlsx');
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Companies');
    sheet.addRow(['Company Name', 'Website', 'Industry']);
    sheet.addRow(['Acme, Inc', { text: 'acme.com', hyperlink: 'https://acme.com' }, 'Banking']);
    sheet.addRow([]);
    sheet.addRow(['Beta Pty Ltd', 'beta.com.au', 'Banking']);
    await book.xlsx.writeFile(file);

    const { headers, records } = await readXlsx(file);
    expect(headers).toEqual(['Company Name', 'Website', 'Industry']);
    expect(records).toEqual([
      { 'Company Name': 'Acme, Inc', Website: 'acme.com', Industry: 'Banking' },
      { 'Company Name': 'Beta Pty Ltd', Website: 'beta.com.au', Industry: 'Banking' },
    ]);
    expect(findHeader(headers, /company name/i)).toBe('Company Name');
  });

  test('parseCount and parseTabCount read UI count formats', () => {
    expect(parseCount('1,234 companies')).toBe(1234);
    expect(parseCount('12.5K results')).toBe(12500);
    expect(parseCount('no number')).toBeNaN();
    expect(parseTabCount('Companies (2,066,723)')).toBe(2066723);
    expect(parseTabCount('People (0)')).toBe(0);
  });

  test('masked vs revealed contact detection', () => {
    expect('j***@acme.com').toMatch(MASKED_REGEX);
    expect('jane@acme.com').not.toMatch(MASKED_REGEX);
    expect('jane@acme.com').toMatch(EMAIL_REGEX);
  });

  test('generated data is unique, prefixed and Clerk test compatible', () => {
    const names = new Set(Array.from({ length: 500 }, () => uniqueName('list', 3)));
    expect(names.size).toBe(500);
    for (const n of names) expect(n).toMatch(/^qa-as-list-w3-/);
    expect(clerkTestEmail(1)).toMatch(/^qa-as-.+\+clerk_test@example\.com$/);
  });
});
