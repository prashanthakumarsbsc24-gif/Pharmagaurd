const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts. Wait a few minutes and try again.' },
});

router.post('/register', limiter, ctrl.register);
router.post('/login', limiter, ctrl.login);
router.get('/me', requireAuth, ctrl.me);
router.patch('/me', requireAuth, ctrl.updateMe);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;
