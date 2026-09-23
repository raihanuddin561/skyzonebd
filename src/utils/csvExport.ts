/**
 * Minimal client-side CSV export — no dependency needed. Amazon-style
 * gap-closure Phase 2 part 4: this project had no CSV-export pattern
 * anywhere in the admin UI before this.
 */

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // CSV/formula-injection mitigation (OWASP): a cell that starts with
  // =, +, -, @, a tab, or a carriage return is interpreted as a live
  // formula by Excel/Google Sheets the moment the exported file is opened.
  // Any customer-controlled free-text field (name, partner name, etc.)
  // could smuggle a formula like =HYPERLINK(...) through an export. Prefix
  // with a literal single quote so spreadsheet apps render the cell as
  // plain text instead of executing it. This must happen BEFORE the
  // quote/comma/newline escaping below so the quoting still applies
  // correctly to the (now-prefixed) value.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
