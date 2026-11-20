const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.get('/', requireAuth, ctrl.list);

module.exports = router;
