/**
 * Created by Mb
 */
 
const express = require('express');
const router = express.Router();

const controller = require('../../controllers').user;

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgot_password);
router.get('/resetpassword', controller.resetpasswordget);
router.post('/resetpassword', controller.resetpasswordpost);
router.get("/as", controller.AS);
router.get("/ds", controller.DS);

module.exports = router;
