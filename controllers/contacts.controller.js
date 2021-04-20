//import mongoose and models
var mongoose = require('mongoose');
var User = mongoose.model('users');
var ContactUs = mongoose.model('contacts');
var config = require('dotenv').config();

//Lodash for data manipulation
const _ = require('lodash');

//bluebird for promises
const promise = require('bluebird');

//async for async tasks
var async = require('async');

//helper functions
logger = require("../helpers/logger");
agenda = require("../helpers/agenda.helper");
userHelper = require("../helpers/user.helper");
responseHelper = require("../helpers/response.helper");

var pageSize = parseInt(config.PAGE_SIZE);

var contactUs = async (req, res) => {
    console.log("request received for contactUs");
    var reqData = req.body;
    reqData.user = req.token_decoded.d;
    if (!reqData.email) {
        var message = "No email specified";
        return responseHelper.requestfailure(res, message);
    }
    var contactus = new ContactUs(reqData);
    return contactus.save()
        .then((contacted) => {
            res.mailer.send('emails/contactus.html', {
                customername: contacted.name ? contacted.name : "No Name specified",
                customeremail: contacted.email ? contacted.email : "No email specified",
                customerphone: contacted.phone ? contacted.phone : "No phone specified",
                message: contacted.message,
                title: project.title,
                to: config.SUPPORT_EMAIL, // REQUIRED. This can be a comma delimited string just like a normal email to field.
                subject: 'User Contacted', // REQUIRED.
            }, function (err) {
                if (err) {
                    return console.error("Email could not sent: ", err)
                }
                var message = "contacted successfully";
                return responseHelper.success(res, contacted, message);
            });

        })
        .catch((err) => {
            console.log(err);
            var message = err.message ? err.message : err;
            responseHelper.requestfailure(res, message);
        })
};

module.exports = {
    contactUs
};



