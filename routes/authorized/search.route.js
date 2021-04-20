const express = require('express');
const router = express.Router();

const controller = require('../../controllers').search;

router.post('/', controller.search);
router.get('/users-by-tag/:tag', controller.usersByTag);

module.exports = router;
