import * as fs from 'fs';

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export interface CsvFile {
  headers: string[];
  records: Record<string, string>[];
}

export function readCsvFile(filePath: string): CsvFile {
  const [headers = [], ...data] = parseCsv(fs.readFileSync(filePath, 'utf-8'));
  const normalised = headers.map((h) => h.trim());
  const records = data.map((cells) =>
    Object.fromEntries(normalised.map((h, i) => [h, (cells[i] ?? '').trim()])),
  );
  return { headers: normalised, records };
}

export function findHeader(headers: string[], wanted: RegExp): string | undefined {
  return headers.find((h) => wanted.test(h.replace(/[_\s]+/g, ' ')));
}
