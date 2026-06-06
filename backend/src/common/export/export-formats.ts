import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'json' | 'xlsx';

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '\n';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const lines = rows.map((r) =>
    keys.map((k) => csvEscape(String(r[k] ?? ''))).join(','),
  );
  return [header, ...lines].join('\n') + '\n';
}

export function rowsToJson(rows: unknown[]): string {
  return JSON.stringify(rows, null, 2);
}

export function rowsToXlsxBuffer(rows: Record<string, unknown>[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ _empty: '' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export function parseExportFormat(raw?: string): ExportFormat {
  const f = raw?.toLowerCase().trim();
  if (f === 'json' || f === 'xlsx') return f;
  return 'csv';
}
