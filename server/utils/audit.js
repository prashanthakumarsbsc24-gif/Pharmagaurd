const AuditLog = require('../models/AuditLog');

// Never lets an audit failure break the request that triggered it.
async function audit(user, action, details = '') {
  try {
    await AuditLog.create({
      user: user._id,
      username: user.username,
      role: user.role,
      action,
      details,
    });
  } catch (err) {
    console.error('Audit write failed:', err.message);
  }
}

module.exports = audit;
