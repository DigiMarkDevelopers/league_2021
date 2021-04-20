const express = require('express');
const router = express.Router();
var permit = require("../../middlewares").permit;
const controller = require('../../controllers').match;

//restricted routes
// router.get('/getmydata', permit('_a'), controller.getmydata);


// non-restricted routes
router.post('/add-match', controller.createMatch);
router.post('/update-match', controller.updateMatch);
router.post('/get-match', controller.getMatch);
router.get('/list-matches', controller.listMatches);
router.post('/delete-match', controller.deleteMatch);
router.post('/pay-for-match', controller.payForMatch);
router.post('/get-match-list', controller.getMatchListUser);
router.post('/get-match-payment-detail', controller.getMatchPaymentDetial);
router.post('/create-token', controller.createToken);

module.exports = router;
