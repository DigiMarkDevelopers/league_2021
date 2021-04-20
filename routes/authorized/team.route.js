const express = require('express');
const router = express.Router();
var permit = require("../../middlewares").permit;
const controller = require('../../controllers').team;

//restricted routes
// router.get('/getmydata', permit('_a'), controller.getmydata);


// non-restricted routes
router.post('/add-team', controller.createTeam);
router.get('/list-teams', controller.listTeams);
router.post('/change-captain', controller.changeCaptain);
router.post('/get-team', controller.getTeam);
router.post('/upload-image', controller.uploadImage);
router.post('/delete-team', controller.deleteTeam);
router.post('/update-team', controller.updateTeam);
router.post('/add-player', controller.addPlayer);
router.post('/remove-player', controller.removePlayer);

module.exports = router;
