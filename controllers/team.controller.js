//import mongoose and models
var mongoose = require('mongoose');
var Meetings = mongoose.model('cronjobs');
var User = mongoose.model('users');
var Team = mongoose.model('teams');
var ForgetPassword = mongoose.model('forgetpasswords');
var config = require('dotenv').config();
var notificationCtrl = require("./notifications.controller");

//crypto
var Cryptr = require('cryptr'), cryptr = new Cryptr(process.env.ENCRYPTOR_SECRET);

//Lodash for data manipulation
const _ = require('lodash');

//bluebird for promises
const promise = require('bluebird');

//import randomatic to create unique user verification code
var randomize = require('randomatic');

//async for async tasks
var async = require('async');
var general_errors = require('../constants').ERROR_MESSAGES;
var general_messages = require('../constants').SUCCESS_MESSAGES;
//helper functions
logger = require("../helpers/logger");
userHelper = require("../helpers/user.helper");
responseHelper = require("../helpers/response.helper");
var path = require('path');

var multer = require('multer');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
var upload = multer({ storage: storage }).single('image');

var pageSize = parseInt(config.PAGE_SIZE);

var uploadImage = async (req, res) => {
    console.log("--- uploadImage method is called ---");
    try {
        upload(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                return responseHelper.systemfailure(res, err);
            } else if (err) {
                // An unknown error occurred when uploading.
                return responseHelper.systemfailure(res, err);
            }
            return responseHelper.success(res, {path: '/uploads/' + req.file.filename}, general_messages.SUCCESSFULLY_UPLOADED);
        });
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var createTeam = async (req, res) => {
    console.log("--- createTeam method is called ---");
    let teamData = req.body;
    try {
        let exist = await Team.findOne({name: teamData.name});
        if (exist) {
            return responseHelper.requestfailure(res, general_errors.TEAM_ALREADY_EXITS);
        }

        let team = new Team(teamData);

        await team.save();

        for (let i =0; i < team.players.length; i++) {
            await User.findOneAndUpdate({_id: team.players[i]}, { $set: {team: team._id}});
        }
        return responseHelper.success(res, team, general_messages.SUCCESSFULLY_CREATED);
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var updateTeam = async (req, res) => {
    console.log("--- updateTeam method is called ---");
    let teamData = req.body;
    delete teamData._id;
    let team_id = req.query.team_id;
    try {

        let exist = await Team.findOne({name: teamData.name, _id: {$ne : team_id}});

        if (exist) {
            return responseHelper.requestfailure(res, general_errors.TEAM_ALREADY_EXITS);
        }

        let team = await Team.findOneAndUpdate({_id: team_id}, teamData, {new: true});

        return responseHelper.success(res, team, general_messages.SUCCESSFULLY_UPDATED_DATA);
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var listTeams = async (req, res) => {
    console.log("--- listTeams method is called ---");
    try {
        let teams = await Team.find({is_active: true, is_deleted: false});
        return responseHelper.success(res, teams, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var changeCaptain = async (req, res) => {
    console.log("--- changeCaptain method is called ---");
    let teamData = req.body;
    try {
        let team = await Team.findByIdAndUpdate(teamData._id, {captain: teamData.captain}, {new: true});
        return responseHelper.success(res, team, general_messages.SUCCESSFULLY_UPDATED_DATA);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var removePlayer = async (req, res) => {
    console.log("--- removePlayer method is called ---");
    let teamData = req.body;
    try {
        let team = await Team.findById(teamData.team_id);
        if (!team) {
            return responseHelper.requestfailure(res, general_errors.TEAM_DONOT_EXITS);
        }
        if (team.captain == teamData.player_id) {
            return responseHelper.requestfailure(res, general_errors.CANNOT_DELETE_CAPTAIN);
        }

        team = await Team.findByIdAndUpdate(teamData.team_id, {
            $pull: {players: teamData.player_id}
        }, {new: true});
        await User.findOneAndUpdate({_id: teamData.player_id}, { $set: {team: null}});
        return responseHelper.success(res, team, general_messages.SUCCESSFULLY_UPDATED_DATA);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var addPlayer = async (req, res) => {
    console.log("--- addPlayer method is called ---");
    let teamData = req.body;
    try {
        let team = await Team.findById(teamData.team_id);
        if (!team) {
            return responseHelper.requestfailure(res, general_errors.TEAM_DONOT_EXITS);
        }

        if (team.players.length >= 12) {
            return responseHelper.requestfailure(res, general_errors.MAX_PLAYERS);
        }

        team = await Team.findByIdAndUpdate(teamData.team_id,  {
            $addToSet: {players: teamData.player_id}
        }, {new: true});

        await User.findOneAndUpdate({_id: teamData.player_id}, { $set: {team: team._id}});
        return responseHelper.success(res, team, general_messages.SUCCESSFULLY_UPDATED_DATA);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var getTeam = async (req, res) => {
    console.log("--- getTeam method is called ---");
    let teamData = req.body;
    try {
        let team = await Team.findById(teamData._id)
            .populate('captain')
            .populate('players');
        return responseHelper.success(res, team, general_messages.SUCCESSFULLY_DELETED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var deleteTeam = async (req, res) => {
    console.log("--- deleteTeam method is called ---");
    let teamData = req.body;
    try {
        let team = await Team.findById(teamData._id);
        team = await Team.findByIdAndUpdate(teamData._id, {is_deleted: true, name: team.name + Date.now()}, {new: true});
        await User.update({team: teamData._id}, {team: null}, {new: true});
        await Match.update({team_a: teamData._id}, {team_a: null}, {new: true});
        await Match.update({team_b: teamData._id}, {team_b: null}, {new: true});
        return responseHelper.success(res, team, general_messages.SUCCESSFULLY_DELETED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};


module.exports = {
    createTeam,
    listTeams,
    changeCaptain,
    deleteTeam,
    getTeam,
    uploadImage,
    updateTeam,
    removePlayer,
    addPlayer
};
