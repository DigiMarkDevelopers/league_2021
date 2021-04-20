const express = require('express');
const router = express.Router();

const controller = require('../../controllers').contacts;

router.post('/contact-us', controller.contactUs);

module.exports = router;
