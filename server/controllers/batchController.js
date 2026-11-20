const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const HttpError = require('../utils/httpError');
const audit = require('../utils/audit');
const { parseBatchInput } = require('../utils/validators');
const { formatMoney } = require('../config/regions');

const MAX_IMPORT_ROWS = 20000;
const REASONS = {
  remove: 'Batch Removed',
  'write-off': 'Stock Written Off',
  disposal: 'Disposal Logged',
};

const describe = (b) => `${b.medicationName} · lot ${b.batchNumber} · ${b.quantity} units`;
const dateOnly = (d) => d.toISOString().slice(0, 10);

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid batch id.');
};

const duplicateMessage = 'A batch with this medication, lot number and expiry date already exists. Edit that record instead.';

exports.list = async (req, res) => {
  const rows = await Batch.find({ user: req.user._id }).sort({ expirationDate: 1, medicationName: 1 }).lean();
  res.json(rows.map(Batch.serialize));
};

exports.create = async (req, res) => {
  const data = parseBatchInput(req.body);
  let batch;
  try {
    batch = await Batch.create({ ...data, user: req.user._id });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, duplicateMessage);
    throw err;
  }
  await audit(req.user, 'Batch Created', describe(batch));
  res.status(201).json(Batch.serialize(batch));
};

exports.update = async (req, res) => {
  assertValidId(req.params.id);
  const data = parseBatchInput(req.body);

  const before = await Batch.findOne({ _id: req.params.id, user: req.user._id });
  if (!before) throw new HttpError(404, 'Batch not found.');

  const changes = [];
  const track = (label, a, b) => { if (String(a) !== String(b)) changes.push(`${label} ${a} → ${b}`); };
  track('name', before.medicationName, data.medicationName);
  track('lot', before.batchNumber, data.batchNumber);
  track('storage', before.storage, data.storage);
  track('price', before.price, data.price);
  track('quantity', before.quantity, data.quantity);
  track('units sold', before.unitsSold, data.unitsSold);
  track('expiry', dateOnly(before.expirationDate), dateOnly(data.expirationDate));

  before.set(data);
  try {
    await before.save();
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, duplicateMessage);
    throw err;
  }
  if (changes.length) await audit(req.user, 'Batch Updated', `${data.medicationName}: ${changes.join('; ')}`);
  res.json(Batch.serialize(before));
};

exports.remove = async (req, res) => {
  assertValidId(req.params.id);
  const reason = req.query.reason === undefined ? 'remove' : req.query.reason;
  if (!Object.hasOwn(REASONS, reason)) throw new HttpError(400, 'Reason must be remove, write-off or disposal.');

  const batch = await Batch.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!batch) throw new HttpError(404, 'Batch not found.');

  let details = describe(batch);
  if (reason === 'write-off') {
    details += ` · loss ${formatMoney(batch.price * batch.quantity, req.user.region)}`;
  }
  await audit(req.user, REASONS[reason], details);
  res.json({ message: `${REASONS[reason]}.`, id: String(batch._id) });
};

exports.importMany = async (req, res) => {
  const { rows, filename } = req.body ?? {};
  if (!Array.isArray(rows) || rows.length === 0) throw new HttpError(400, 'No rows to import.');
  if (rows.length > MAX_IMPORT_ROWS) throw new HttpError(400, `Import at most ${MAX_IMPORT_ROWS.toLocaleString()} rows at a time.`);

  const valid = [];
  const invalid = [];
  const seen = new Set();
  let duplicateInFile = 0;

  rows.forEach((row, i) => {
    try {
      const data = parseBatchInput(row);
      const key = `${data.medicationName}|${data.batchNumber}|${dateOnly(data.expirationDate)}`;
      if (seen.has(key)) { duplicateInFile += 1; return; }
      seen.add(key);
      valid.push(data);
    } catch (err) {
      if (invalid.length < 50) invalid.push({ row: i + 1, error: err.message });
    }
  });

  let inserted = 0;
  if (valid.length) {
    // $setOnInsert: existing records are left untouched, so importing the same file twice adds nothing.
    const result = await Batch.bulkWrite(
      valid.map((data) => ({
        updateOne: {
          filter: {
            user: req.user._id,
            medicationName: data.medicationName,
            batchNumber: data.batchNumber,
            expirationDate: data.expirationDate,
          },
          update: { $setOnInsert: data },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    inserted = result.upsertedCount;
  }

  const summary = {
    received: rows.length,
    inserted,
    skippedExisting: valid.length - inserted,
    skippedDuplicateInFile: duplicateInFile,
    invalidCount: rows.length - valid.length - duplicateInFile,
    invalid,
  };

  const label = typeof filename === 'string' ? filename.slice(0, 120) : 'upload';
  await audit(
    req.user,
    'CSV Import',
    `${label}: ${summary.inserted} added, ${summary.skippedExisting + summary.skippedDuplicateInFile} duplicates skipped, ${summary.invalidCount} invalid.`
  );
  res.status(201).json(summary);
};
