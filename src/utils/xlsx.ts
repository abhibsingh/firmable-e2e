import ExcelJS from 'exceljs';

export interface Sheet {
  headers: string[];
  records: Record<string, string>[];
}

export async function readXlsx(filePath: string): Promise<Sheet> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(filePath);
  const sheet = book.worksheets[0];
  if (!sheet) return { headers: [], records: [] };

  const cell = (v: ExcelJS.CellValue): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if ('text' in v) return String(v.text);
      if ('result' in v) return String(v.result ?? '');
      if ('richText' in v) return v.richText.map((r) => r.text).join('');
    }
    return String(v);
  };

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as ExcelJS.CellValue[];
    rows.push(values.slice(1).map((v) => cell(v).trim()));
  });

  const [headers = [], ...data] = rows;
  const records = data
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  return { headers, records };
}

export function findHeader(headers: string[], wanted: RegExp): string | undefined {
  return headers.find((h) => wanted.test(h.replace(/[_\s]+/g, ' ')));
}
