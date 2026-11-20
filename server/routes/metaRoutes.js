const router = require('express').Router();
const ctrl = require('../controllers/metaController');

router.get('/options', ctrl.options);

module.exports = router;
