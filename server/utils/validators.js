const HttpError = require('./httpError');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function parseDateOnly(value) {
  const s = str(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  const year = d.getUTCFullYear();
  if (year < 1990 || year > 2100) return null;
  return d;
}

function parseNumber(value, { label, integer = false, max = 1e9, fallback }) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new HttpError(400, `${label} is required.`);
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, `${label} must be a number between 0 and ${max}.`);
  if (integer && !Number.isInteger(n)) throw new HttpError(400, `${label} must be a whole number.`);
  return n;
}

// Validates one batch payload (manual form or a CSV row). Throws HttpError(400) with a readable message.
function parseBatchInput(src) {
  const body = src && typeof src === 'object' ? src : {};

  const medicationName = str(body.medicationName);
  if (!medicationName) throw new HttpError(400, 'Medication name is required.');
  if (medicationName.length > 160) throw new HttpError(400, 'Medication name is too long (max 160 characters).');

  const batchNumber = str(body.batchNumber) || 'N/A';
  if (batchNumber.length > 60) throw new HttpError(400, 'Batch number is too long (max 60 characters).');

  const storage = str(body.storage) || 'Room temp (15–25°C)';
  if (storage.length > 80) throw new HttpError(400, 'Storage condition is too long (max 80 characters).');

  const expirationDate = parseDateOnly(body.expirationDate);
  if (!expirationDate) throw new HttpError(400, 'Expiration date must be a valid date (YYYY-MM-DD).');

  return {
    medicationName,
    batchNumber,
    storage,
    expirationDate,
    price: parseNumber(body.price, { label: 'Price', fallback: 0 }),
    quantity: parseNumber(body.quantity, { label: 'Quantity', integer: true }),
    unitsSold: parseNumber(body.unitsSold, { label: 'Units sold', integer: true, fallback: 0 }),
  };
}

module.exports = { parseBatchInput, parseDateOnly, str };
