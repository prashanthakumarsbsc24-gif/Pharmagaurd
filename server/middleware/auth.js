const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');

// Verifies the Bearer token and loads the user so role/region are always current.
module.exports = async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Sign in to continue.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session has expired. Sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'This account no longer exists.');
  req.user = user;
  next();
};
