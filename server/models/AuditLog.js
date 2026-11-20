const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },
    role: { type: String },
    action: { type: String, required: true },
    details: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ user: 1, createdAt: -1 });

// Append-only: the application can create and read entries, never change or remove them.
const blocked = ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
  'deleteOne', 'deleteMany', 'findOneAndDelete'];
auditLogSchema.pre(blocked, function () {
  throw new Error('Audit log entries are immutable.');
});
auditLogSchema.pre('save', function () {
  if (!this.isNew) throw new Error('Audit log entries are immutable.');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
