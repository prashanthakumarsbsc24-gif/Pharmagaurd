// CSV parsing, normalisation and export.

// Handles quoted fields, "" escapes, embedded newlines, BOM, and comma / semicolon / tab delimiters.
export function parseCSV(text) {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delimiter = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell.trim()); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = []; cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);

  if (rows.length < 2) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.toLowerCase().replace(/[\s-]+/g, '_'));
  const records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  return { headers, records };
}

// ---- value parsers -------------------------------------------------------------------------

export function parseMoney(value) {
  if (value === undefined || value === null || String(value).trim() === '') return 0;
  let s = String(value).replace(/[^\d.,-]/g, '');
  if (s.includes(',') && s.includes('.')) {
    // whichever separator comes last is the decimal point
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseCount(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const n = Number(String(value).replace(/[,\s]/g, ''));
  if (Number.isFinite(n)) return Math.round(n);
  const m = String(value).match(/\d+/);   // "20 strips" -> 20
  return m ? Number(m[0]) : NaN;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');

function toISO(y, m, d) {
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Accepts 2027-03-31, 31/03/2027, 03/31/2027 (US), 31-Mar-2027, Mar 31 2027, and pharma-style 03/2027
// (a month/year expiry means the last day of that month).
export function parseDate(value, regionCode) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return toISO(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
    return regionCode === 'US' ? toISO(+m[3], +m[1], +m[2]) : toISO(+m[3], +m[2], +m[1]);
  }
  if ((m = s.match(/^(\d{1,2})[-/.](\d{4})$/))) {
    const month = +m[1];
    if (month < 1 || month > 12) return null;
    return toISO(+m[2], month, new Date(Date.UTC(+m[2], month, 0)).getUTCDate());
  }
  if ((m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{2,4})$/))) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mi >= 0 ? toISO(+m[3], mi + 1, +m[1]) : null;
  }
  if ((m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/))) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return mi >= 0 ? toISO(+m[3], mi + 1, +m[2]) : null;
  }
  return null;
}

// ---- row normalisation ---------------------------------------------------------------------

const pick = (rec, keys) => {
  for (const k of keys) if (rec[k] !== undefined && String(rec[k]).trim() !== '') return rec[k];
  return '';
};

export const COLUMN_ALIASES = {
  medicationName: ['name', 'medication', 'medication_name', 'medicine', 'drug', 'product', 'item'],
  batchNumber: ['batch', 'batch_number', 'batch_no', 'lot', 'lot_number', 'lot_no'],
  price: ['price', 'unit_price', 'cost', 'mrp', 'price_inr', 'price_usd', 'price_gbp', 'price_eur', 'price_aed'],
  quantity: ['stock', 'quantity', 'qty', 'units', 'in_stock'],
  expirationDate: ['date', 'expiration_date', 'expiry_date', 'expiry', 'expiration', 'exp_date', 'exp'],
  storage: ['storage', 'storage_condition', 'storage_conditions'],
  unitsSold: ['units_sold', 'sold', 'sales'],
};

// Returns { row } or { error } for each CSV record.
export function normaliseRecord(rec, regionCode) {
  const medicationName = pick(rec, COLUMN_ALIASES.medicationName);
  if (!medicationName) return { error: 'Missing medication name' };

  const rawDate = pick(rec, COLUMN_ALIASES.expirationDate);
  const expirationDate = parseDate(rawDate, regionCode);
  if (!expirationDate) return { error: rawDate ? `Unreadable expiry date “${rawDate}”` : 'Missing expiry date' };

  const price = parseMoney(pick(rec, COLUMN_ALIASES.price));
  if (Number.isNaN(price) || price < 0) return { error: 'Price is not a valid number' };

  const quantity = parseCount(pick(rec, COLUMN_ALIASES.quantity), 0);
  if (Number.isNaN(quantity) || quantity < 0) return { error: 'Stock is not a valid number' };

  const unitsSold = parseCount(pick(rec, COLUMN_ALIASES.unitsSold), 0);
  if (Number.isNaN(unitsSold) || unitsSold < 0) return { error: 'Units sold is not a valid number' };

  return {
    row: {
      medicationName,
      batchNumber: pick(rec, COLUMN_ALIASES.batchNumber) || 'N/A',
      storage: pick(rec, COLUMN_ALIASES.storage) || undefined,
      price,
      quantity,
      unitsSold,
      expirationDate,
    },
  };
}

// ---- export --------------------------------------------------------------------------------

// Prefixing = + - @ stops spreadsheet apps from running a cell as a formula.
const safeCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function downloadCSV(filename, headers, rows) {
  const text = [headers, ...rows].map((r) => r.map(safeCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
