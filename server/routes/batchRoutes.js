const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/batchController');

router.use(requireAuth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/import', ctrl.importMany);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
