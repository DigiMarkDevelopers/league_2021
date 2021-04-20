//agenda to be used from helpers file
var Agenda = require('./agenda');
const config = require('dotenv').config();
//agenda connecting mongo
let  mongoConnectionString = '';
if (config.NODE_ENV === 'local') {
    mongoConnectionString = 'mongodb://127.0.0.1:27017/leagr';
} else {
    mongoConnectionString = 'mongodb://' + config.DB_USER + ':' + config.DB_PASSWORD + '@' + config.DB_HOST + ':' + config.DB_PORT + '/' + config.DB_NAME + '?authSource=' + config.DB_authSource;
}

var agenda = new Agenda({
    db: {address: mongoConnectionString, collection: 'cronjobs'},
    defaultConcurrency: 100,
    maxConcurrency: 500
});


//bluebird for handling promise and async for asnyc tasks
const promise = require('bluebird');
var async = require('async');

//import mongoose and models
var mongoose = require('mongoose');
var User = mongoose.model('users');
var Match = mongoose.model('matches');
var CronJobs = mongoose.model('cronjobs');

//helper functions
logger = require("../helpers/logger");
userHelper = require("../helpers/user.helper");
responseHelper = require("../helpers/response.helper");
notification = require("../controllers/notifications.controller");
const _ = require("lodash");


const notificationtexts = require("../constants").notification_texts;

var start_agenda = async () => {

    var res = await new promise(resolve => agenda.once('ready', resolve));
    agenda.start();
    return true;

};

var reschedule_agenda = async () => {
    return CronJobs.find({nextRunAt: {$ne: null}})
        .then((pending_crons) => {
            async.forEach(pending_crons, function (cron, callback) {
                logger.info(cron);
                eval('var fn = ' + cron.data.job);
                agenda.define(cron.name, {priority: 'high'}, fn);
                callback();
            });
            return 'done'
        })
        .then((done) => {
            logger.info(done);
            return done;
        })
        .catch((err) => {
            logger.info(err);
            return err;
        })
};


var schedulePastNotification = async (match, resp) => {
    let date = new Date(match.date_and_time);
    date.setHours(date.getHours() - 3);
    resp === 'resp' ? console.log(ok) : console.log()
    agenda.define(match._id.toString() + '-past', {priority: 'high'}, function (job, done) {
        Match.findById(job.attrs.data.match._id.toString())
            .populate('team_a')
            .populate('team_b')
            .populate('paid_by')
            .lean()
            .exec(async (err, match)=> {
                for (let player of match.team_a.players) {
                    if(match.paid_by.find(x => x._id.toString() === player.toString())) {
                        notification.sendNotification(notificationtexts.reminder.type, "Get ready! Match in 3 hours from now at " + match.location, player, player, notificationtexts.reminder.title, JSON.stringify(match));
                    } else {
                        notification.sendNotification(notificationtexts.reminder.type, "You didn't pay for the Match in 3 hours from now at " + match.location, player, player, notificationtexts.reminder.title, JSON.stringify(match));
                    }
                }
                let admin = await User.findOne({role: 'admin'});
                notification.sendNotification(notificationtexts.reminder.type, "Get ready! Match in 3 hours from now at " + match.location, admin._id.toString(), admin._id.toString(), notificationtexts.reminder.title, JSON.stringify(match));
            });
        done();
    });
    agenda.schedule(date, match._id.toString() + '-past', {match, jobname: match._id.toString() + '-past'});
};

var cancelPastNotification = async (match) => {
    agenda.cancel({name: match._id.toString() + '-past'});
};


var scheduleFutureNotification = async (match) => {
    let date = new Date(match.date_and_time);
    date.setHours(date.getHours() + 48);
    agenda.define(match._id.toString() + '-future', {priority: 'high'}, function (job, done) {
        Match.findById(job.attrs.data.match._id.toString())
            .populate('team_a')
            .populate('team_b')
            .populate('paid_by')
            .lean()
            .exec(async (err, match)=> {
                for (let player of match.team_a.players) {
                    if(match.paid_by.find(x => x._id.toString() === player.toString())) {
                        // notification.sendNotification(notificationtexts.reminder.type, "Get ready! Match in 3 hours from now at " + match.location, player, player, notificationtexts.reminder.title, JSON.stringify(match));
                    } else {
                        notification.sendNotification(notificationtexts.reminder.type, "You didn't pay for the Match at " + match.location, player, player, notificationtexts.reminder.title, JSON.stringify(match));
                    }
                }
                // let admin = await User.findOne({role: 'admin'});
                // notification.sendNotification(notificationtexts.reminder.type, "Get ready! Match in 3 hours from now at " + match.location, admin._id.toString(), admin._id.toString(), notificationtexts.reminder.title, JSON.stringify(match));
            });
        done();
    });
    agenda.schedule(date, match._id.toString() + '-future', {match, jobname: match._id.toString() + '-future'});
};

var cancelFutureNotification = async (match) => {
    agenda.cancel({name: match._id.toString() + '-future'});
};

var scheduleNotification = async (match, resp) => {
    console.log(resp);
    let schedule_past = await schedulePastNotification(match, resp);
    let schedule_future = await scheduleFutureNotification(match);
};

var cancelNotification = async (match) => {
    let cancel_past = await cancelPastNotification(match);
    let cancel_future = await cancelFutureNotification(match);
};

module.exports = {
    start_agenda: start_agenda,
    reschedule_agenda: reschedule_agenda,
    scheduleNotification,
    cancelNotification,
};
