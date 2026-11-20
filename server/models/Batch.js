const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicationName: { type: String, required: true, trim: true, maxlength: 160 },
    batchNumber: { type: String, trim: true, maxlength: 60, default: 'N/A' },
    storage: { type: String, trim: true, maxlength: 80, default: 'Room temp (15–25°C)' },
    // Stored as a plain number in the owner's region currency (no FX conversion).
    price: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, required: true, min: 0, validate: Number.isInteger },
    unitsSold: { type: Number, min: 0, default: 0, validate: Number.isInteger },
    // Date only, stored as UTC midnight.
    expirationDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// One record per medication + lot + expiry for each user. Makes CSV re-imports idempotent.
batchSchema.index(
  { user: 1, medicationName: 1, batchNumber: 1, expirationDate: 1 },
  { unique: true }
);
batchSchema.index({ user: 1, expirationDate: 1 });

const toDateOnly = (d) => d.toISOString().slice(0, 10);

// Shape returned to the client (works on lean objects too).
batchSchema.statics.serialize = function (b) {
  return {
    id: String(b._id),
    medicationName: b.medicationName,
    batchNumber: b.batchNumber,
    storage: b.storage,
    price: b.price,
    quantity: b.quantity,
    unitsSold: b.unitsSold,
    expirationDate: toDateOnly(b.expirationDate),
    updatedAt: b.updatedAt,
  };
};

module.exports = mongoose.model('Batch', batchSchema);
