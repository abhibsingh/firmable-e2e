import { test, expect } from '@playwright/test';
import { parseCsv } from '../../src/utils/csv';
import { parseCount, MASKED_REGEX, EMAIL_REGEX } from '../../src/utils/text';
import { uniqueName, clerkTestEmail } from '../../src/data/testData';

test.describe('utils', { tag: ['@unit', '@smoke'] }, () => {
  test('parseCsv handles quotes, commas, newlines and BOM', () => {
    const csv = '\uFEFFName,Domain\r\n"Acme, Inc","acme.com"\n"Quote ""Co""",q.co\n"Multi\nLine",m.io\n';
    expect(parseCsv(csv)).toEqual([
      ['Name', 'Domain'],
      ['Acme, Inc', 'acme.com'],
      ['Quote "Co"', 'q.co'],
      ['Multi\nLine', 'm.io'],
    ]);
  });

  test('parseCount reads UI count formats', () => {
    expect(parseCount('1,234 companies')).toBe(1234);
    expect(parseCount('12.5K results')).toBe(12500);
    expect(parseCount('2M people')).toBe(2_000_000);
    expect(parseCount('250 credits')).toBe(250);
    expect(parseCount('no number')).toBeNaN();
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
