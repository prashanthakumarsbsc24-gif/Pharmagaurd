const AuditLog = require('../models/AuditLog');

exports.list = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 2000);
  const rows = await AuditLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(
    rows.map((r) => ({
      id: String(r._id),
      timestamp: r.createdAt,
      user: `${r.username}${r.role ? ` (${r.role})` : ''}`,
      action: r.action,
      details: r.details,
    }))
  );
};
