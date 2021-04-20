const express = require('express');
const router = express.Router();
var permit = require("../../middlewares").permit;
const controller = require('../../controllers').user;

//restricted routes
// router.get('/getmydata', permit('_a'), controller.getmydata);


// non-restricted routes
router.post('/change-password', controller.change_password);
router.post('/verify-email', controller.verify_email);
router.get('/resend-verification', controller.resend_verification);
router.get('/list-users', controller.listUsers);
router.post('/search-users', controller.searchUsers);
router.get('/payout-admin', controller.payoutAdmin);
router.post('/delete-user', controller.deleteUsers);
router.post('/save-fcm-token', controller.saveFCMToken);
router.post('/update-user', controller.updateUser);
router.post('/set-password', controller.setTemporaryPassword);
router.post('/logout', controller.logout);

module.exports = router;
