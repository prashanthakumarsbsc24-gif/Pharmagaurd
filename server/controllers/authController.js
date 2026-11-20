const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const audit = require('../utils/audit');
const { ROLES } = require('../config/roles');
const { REGION_CODES, DEFAULT_REGION, getRegion } = require('../config/regions');
const { str } = require('../utils/validators');

const BCRYPT_ROUNDS = 12;
// Compared against when the username is unknown, so response time doesn't reveal which names exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const signToken = (user) =>
  jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });

exports.register = async (req, res) => {
  const body = req.body ?? {};
  const username = str(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  const role = body.role === undefined ? 'Inventory Manager' : body.role;
  const region = body.region === undefined ? DEFAULT_REGION : body.region;

  if (username.length < 3 || username.length > 40 || !/^[\w .@-]+$/.test(username)) {
    throw new HttpError(400, 'Username must be 3–40 characters: letters, numbers, spaces and . _ - @');
  }
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new HttpError(400, 'Password must be at least 8 characters (72 bytes max).');
  }
  if (!ROLES.includes(role)) throw new HttpError(400, 'Choose a valid role.');
  if (!REGION_CODES.includes(region)) throw new HttpError(400, 'Choose a valid region.');

  if (await User.exists({ usernameKey: username.toLowerCase() })) {
    throw new HttpError(409, 'That username is already taken.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ username, passwordHash, role, region, lastLoginAt: new Date() });
  const { currency } = getRegion(region);
  await audit(user, 'Account Created', `Registered as ${role}. Region ${region} (${currency}).`);

  res.status(201).json({ token: signToken(user), user: user.toPublic() });
};

exports.login = async (req, res) => {
  const body = req.body ?? {};
  const username = str(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) throw new HttpError(400, 'Enter your username and password.');

  const user = await User.findOne({ usernameKey: username.toLowerCase() }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !ok) {
    if (user) await audit(user, 'Authentication Failed', 'Incorrect password.');
    throw new HttpError(401, 'Incorrect username or password.');
  }

  user.lastLoginAt = new Date();
  await user.save();
  await audit(user, 'Authentication Success', `Signed in as ${user.role}.`);

  res.json({ token: signToken(user), user: user.toPublic() });
};

exports.me = (req, res) => {
  res.json({ user: req.user.toPublic() });
};

exports.updateMe = async (req, res) => {
  const { region } = req.body ?? {};
  if (!REGION_CODES.includes(region)) throw new HttpError(400, 'Choose a valid region.');

  if (region !== req.user.region) {
    const from = getRegion(req.user.region);
    const to = getRegion(region);
    req.user.region = region;
    await req.user.save();
    await audit(
      req.user,
      'Region Changed',
      `${from.name} (${from.currency}) → ${to.name} (${to.currency}). Stored prices were not converted.`
    );
  }
  res.json({ user: req.user.toPublic() });
};

exports.logout = async (req, res) => {
  await audit(req.user, 'Session Terminated', 'Signed out.');
  res.json({ message: 'Signed out.' });
};
