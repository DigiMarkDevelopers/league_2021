//import mongoose and models
var mongoose = require('mongoose');
var Meetings = mongoose.model('cronjobs');
var User = mongoose.model('users');
var Team = mongoose.model('teams');
var Match = mongoose.model('matches');
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
var notification_texts = require('../constants').notification_texts;
//helper functions
logger = require("../helpers/logger");
userHelper = require("../helpers/user.helper");
agenda = require("../helpers/agenda.helper");
responseHelper = require("../helpers/response.helper");

var pageSize = parseInt(config.PAGE_SIZE);
var resp = '';
var createMatch = async (req, res) => {
    console.log("--- createMatch method is called ---");
    let matchData = req.body;
    try {
        let match = new Match(matchData);

        await match.save();
        return agenda.scheduleNotification(match, resp).then(() => {
            return responseHelper.success(res, match, general_messages.SUCCESSFULLY_CREATED);
        })
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var updateMatch = async (req, res) => {
    console.log("--- updateMatch method is called ---");
    let matchData = req.body;
    delete matchData._id;
    let match_id = req.query.match_id;
    try {
        return agenda.cancelNotification({...matchData, ...{_id: match_id}}).then(async () => {
            let match = await Match.findOneAndUpdate({_id: match_id}, matchData, {new: true});
            return agenda.scheduleNotification(match).then(() => {
                return responseHelper.success(res, match, general_messages.SUCCESSFULLY_UPDATED_DATA);
            });
        })
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var listMatches = async (req, res) => {
    console.log("--- listMatches method is called ---");
    try {
        let upcoming_matches = await Match.find({is_deleted: false, date_and_time : { $gte : new Date()}}, {}, {sort: 'date_and_time'})
            .populate('team_a')
            .populate('team_b');
        let past_matches = await Match.find({is_deleted: false, date_and_time : { $lte : new Date()}}, {}, {sort: 'date_and_time'})
            .populate('team_a')
            .populate('team_b');
        let balance_obj = await stripe.balance.retrieve();
        resp = req.query.match ? 'resp' : '';
        console.log(balance_obj);
        let balance = Number((balance_obj.available[0].amount/100).toFixed());
        return responseHelper.success(res, {upcoming_matches, past_matches, balance}, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var getMatch = async (req, res) => {
    console.log("--- getMatch method is called ---");
    let matchData = req.body;
    try {
        let match = await Match.findOne({_id: matchData._id, is_deleted: false})
            .populate('team_a')
            .populate('team_b');

        return responseHelper.success(res, match, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var getMatchPaymentDetial = async (req, res) => {
    console.log("--- getMatchPaymentDetial method is called ---");
    let matchData = req.body;
    try {
        let match = await Match.findOne({_id: matchData._id, is_deleted: false})
            .populate({
                path: 'team_a',
                populate: {
                    path: 'players'
                }
            })
            .populate({
                path: 'team_b',
                populate: {
                    path: 'players'
                }
            })
            .lean();
        for (let i=0; i < match.paid_by.length; i++) {
            match.paid_by[i] = match.paid_by[i].toString();
        }
        for (let p of match.team_a.players) {
            p.paid = match.paid_by.indexOf(p._id.toString()) > -1;
        }
        for (let p of match.team_b.players) {
            p.paid = match.paid_by.indexOf(p._id.toString()) > -1;
        }
        return responseHelper.success(res, match, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var deleteMatch = async (req, res) => {
    console.log("--- deleteMatch method is called ---");
    let matchData = req.body;
    try {
        let match = await Match.findByIdAndUpdate(matchData._id, {is_deleted: true}, {new: true});
        return agenda.cancelNotification(match).then(() => {
            return responseHelper.success(res, match, general_messages.SUCCESSFULLY_DELETED);
        });
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var payForMatch = async (req, res) => {
    console.log("--- payForMatch method is called ---");
    let reqData = req.body;
    let user_id = req.token_decoded.d;
    try {
        let match = await Match.findOne({ _id: reqData._id, is_deleted: false, paid_by: {$ne: user_id}});
        let user = await User.findOne({ _id: user_id});

        if (!match) {
            return responseHelper.requestfailure(res, general_errors.NOT_ABLE_TO_PAY);
        }
        // let amount = Number(Number((match.price)/26 * 100).toFixed());
        let amount = Number(Number(match.price * 100).toFixed());

        const charge = await stripe.charges.create({
            amount: amount,
            currency: 'usd',
            source: req.body.token,
            description: 'Charge for following match - ' + reqData._id,
        });

        match = await Match.findOneAndUpdate({ _id: reqData._id}, { $addToSet: {paid_by: user_id}}, {new: true});
        let admin = await User.findOne({role: 'admin'});
        notificationCtrl.sendNotification(notification_texts.paid.type, "You just paid $" + amount/100 + " for match located in " + match.location, user_id.toString(), user_id.toString(), notification_texts.paid.title, JSON.stringify(match));

        notificationCtrl.sendNotification(notification_texts.paid.type, user.username +  " just paid $" + amount/100 + " for match located in " + match.location, admin._id.toString(), user_id.toString(), notification_texts.paid.title, JSON.stringify(match));

        return responseHelper.success(res, match, general_messages.SUCCESSFULLY_PAID);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};


var getMatchListUser = async (req, res) => {
    console.log("--- getMatchListUser method is called ---");
    let user_id = req.token_decoded.d;
    try {
        // let team = await Team.findOne({players: user_id});
        let user = await User.findOne({_id: user_id});
        console.log(user);
        let unpaid_matches = await Match.find({is_deleted: false, paid_by: {$ne: user_id}, $or: [{team_a: user.team}, {team_b: user.team}]}, {}, {sort: 'date_and_time'})
            .populate('team_a')
            .populate('team_b');
        // let paid_matches = await Match.find({date_and_time: {$gt: new Date()}, is_deleted: false, paid_by: user_id, $or: [{team_a: user.team}, {team_b: user.team}]}, {}, {sort: 'date_and_time'})
        let paid_matches = await Match.find({is_deleted: false, paid_by: user_id, $or: [{team_a: user.team}, {team_b: user.team}]}, {}, {sort: 'date_and_time'})
            .populate('team_a')
            .populate('team_b');


        return responseHelper.success(res, {unpaid_matches, paid_matches}, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var createToken = async (req, res) => {
    console.log("--- createToken method is called ---");
    try {
        const token = await stripe.tokens.create({
            card: {
                number: '4242424242424242',
                exp_month: 9,
                exp_year: 2021,
                cvc: '314',
            },
        });
        return responseHelper.success(res, token, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};


module.exports = {
    createMatch,
    listMatches,
    getMatch,
    deleteMatch,
    payForMatch,
    createToken,
    getMatchListUser,
    getMatchPaymentDetial,
    updateMatch
};
