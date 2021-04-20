//import mongoose and models
var mongoose = require('mongoose');
var User = mongoose.model('users');

var config = require('dotenv').config();

//import randomatic to create unique user character code
var randomize = require('randomatic');

//Lodash for data manipulation
const _ = require('lodash');

//bluebird for promises
const promise = require('bluebird');

const constants = require("../constants");

const pageSize = parseInt(config.PAGE_SIZE);

//helper functions
logger = require("../helpers/logger");
notification = require("../controllers/notifications.controller");
const notificationtexts = require("../constants").notification_texts;

module.exports = {

    getTotalUsers: () => {
        return new Promise(async (resolve, reject) => {
                Promise.all([
                  User.count(),
                  User.count({created_at : { $gte : new Date('01-01-2020'), $lt : new Date('02-01-2020')}}),
                  User.count({created_at : { $gte : new Date('02-01-2020'), $lt : new Date('03-01-2020')}}),
                  User.count({created_at : { $gte : new Date('03-01-2020'), $lt : new Date('04-01-2020')}}),
                  User.count({created_at : { $gte : new Date('04-01-2020'), $lt : new Date('05-01-2020')}}),
                  User.count({created_at : { $gte : new Date('05-01-2020'), $lt : new Date('06-01-2020')}}),
                  User.count({created_at : { $gte : new Date('06-01-2020'), $lt : new Date('07-01-2020')}}),
                  User.count({created_at : { $gte : new Date('07-01-2020'), $lt : new Date('08-01-2020')}}),
                  User.count({created_at : { $gte : new Date('08-01-2020'), $lt : new Date('09-01-2020')}}),
                  User.count({created_at : { $gte : new Date('09-01-2020'), $lt : new Date('10-01-2020')}}),
                  User.count({created_at : { $gte : new Date('10-01-2020'), $lt : new Date('11-01-2020')}}),
                  User.count({created_at : { $gte : new Date('11-01-2020'), $lt : new Date('12-01-2020')}}),
                  User.count({created_at : { $gte : new Date('12-01-2020'), $lt : new Date('01-01-2021')}}),
                ]).then((restults => {
                  let final_results = {};
                  for (let i =0; i<restults.length; i++) {
                    final_results[['total', 'jan', 'feb', 'mar', 'apr',
                      'may', 'jun', 'jul', 'aug',
                      'sep', 'oct', 'nov', 'dec'
                    ][i]] = restults[i];
                  }
                  resolve(final_results);
                })).catch(err => {
                  console.log(err);
                  reject(err);
                })
        });
    },

    reportUser: (reportedBy, reportedUser, reason) => {
        return new Promise((resolve, reject) => {
            var data = {
                reportedBy,
                reportedUser,
                reason
            }
            var report = new Reports(data);
            report.save()
                .then(result => {
                    resolve();
                })
                .catch(error => {
                    reject();
                });
        });
    },

    updateAllowLogs: (id, status) => {
        return User.findOneAndUpdate({_id: id}, {allow_logs: status}, {new: true})
    },

    blockOrUnlblockUser: (blockedby, blockeduser, blockedbywhom, operation = "block") => {
        return new Promise((resolve, reject) => {

            var query = {};

            if (operation === 'block') {
                query = {
                    $addToSet: {blocked: {blockedby: blockedbywhom, user: blockeduser}}
                };
            } else {
                query = {
                    $pull: {blocked: {blockedby: blockedbywhom, user: blockeduser}}
                }
            }

            User.findByIdAndUpdate(blockedby, query)
                .then(result => {
                    resolve();
                })
                .catch(error => {
                    reject();
                });
        });
    },

    listBlockedUsers: (user_id) => {
        return new Promise((resolve, reject) => {
            User.findById(user_id, {blocked: 1, _id: 0})
                .populate('blocked.user', ['full_name', 'user_fb_id', 'profile_media_urls'])
                .then(result => {
                    resolve(result);
                })
                .catch(error => {
                    reject();
                });
        });
    },

    getAvailableAmount: (user_id) => {
        let chargesOfCall = PaymentTransactions.aggregate({
            $match: {
                host: user_id,
                call_at: {$lte: new Date()},
                'payouts.call_payout.status': 'unpaid',
                $or: [
                    {status: "paid"},
                    {status: "refunded"},
                    {status: "attendeeDidntPick"},
                ]
            }
        }, {
            $lookup: {
                from: "receipts",
                localField: "receipt_id",
                foreignField: "_id",
                as: "receipt"
            }
        }, {$unwind: "$receipt"}, {
            $group: {
                _id: null,
                total_call_charges: {$sum: "$receipt.hostRate"},
                total_call_refunds: {$sum: "$receipt.refundedAmount"},
                total_refunds_transactions: {$sum: "$receipt.refundedTransactionAmount"}
            }
        });

        let chargesOfReferrer = PaymentTransactions.aggregate({
            $match: {
                referrer: user_id,
                call_at: {$lte: new Date()},
                'payouts.referral_payout.status': 'unpaid'
            }
        }, {
            $lookup: {
                from: "receipts",
                localField: "receipt_id",
                foreignField: "_id",
                as: "receipt"
            }
        }, {$unwind: "$receipt"}, {
            $group: {
                _id: null,
                total_call_referral_charges: {$sum: "$receipt.referralFee"},
            }
        });
        return Promise.all([chargesOfCall, chargesOfReferrer]).then(([total, refferal]) => {
            let callCharges = 0;
            let refferalCharges = 0;
            if (total.length) {
                callCharges = (total[0].total_call_charges - total[0].total_call_refunds  - total[0].total_refunds_transactions)
            }
            if (refferal.length) {
                refferalCharges = refferal[0].total_call_referral_charges;
            }
            return callCharges + refferalCharges;
        }).catch((err) => {
            console.log(err);
            return err
        })
    },

    manipulateUserToNullArraysForAndroid: (user) => {
        user.fcm_tokens = null;
        if (user.tags.length <= 0) {
            user.tags = null;
        }
        if (user.profile_media_urls.length <= 0) {
            user.profile_media_urls = null;
        }
        if (user.availablility && user.availablility.length <= 0) {
            user.availablility = null;
        }
    },

    isLogin: function (req, callback) {
        this.validateToken(req, function (user) {
            callback(user);
        });
    },

    isUserFbIdExists: (u_fbid) => {
        var where = {user_fb_id: u_fbid};
        return User.findOne(where, '_id')
            .then((user) => {
                if (user) {
                    return true;
                } else {
                    return false;
                }
            })
            .catch((err) => {
                return err;
            });
    },

    isUserEmailExists: (u_email) => {
        var where = {email: u_email};
        return User.findOne(where, '_id')
            .then((user) => {
                if (user) {
                    return true;
                } else {
                    return false;
                }
            })
            .catch((err) => {
                return err;
            });
    },

    isPhoneExists: (u_phone) => {
        var where = {phone: u_phone};
        return User.findOne(where, '_id')
            .then((user) => {
                if (user) {
                    return true;
                } else {
                    return false;
                }
            })
            .catch((err) => {
                return err;
            });
    },

    getUserCode: () => {
        var user_code = randomize('A0', 6);
        var where = {user_code: user_code};
        return User.findOne(where, '_id')
            .then((user) => {
                if (user) {
                    return module.exports.getUserCode();
                } else {
                    return user_code;
                }
            })
            .catch((err) => {
                if (err) {
                    return err;
                }
            })
    },

    getTimeZoneOffSet(timezone, date) {
      let operator = timezone ? timezone.substring(0, 1) : '';
      let timezone_hours = timezone ? timezone.substring(1, 3) : '00';
      let timezone_minutes = timezone ? timezone.substring(3, 5) : '00';
      let serverTimezoneOffset = date.getTimezoneOffset();
      let clientTimezoneOffset = operator === '+' ? parseInt(timezone_hours) * 60 + parseInt(timezone_minutes) : -1*(parseInt(timezone_hours) * 60 + parseInt(timezone_minutes));
      return serverTimezoneOffset + clientTimezoneOffset;
    },
    getUTCDateForAvailabilityArray(timezone, day) {
        let date = new Date();
        let differenceOfTimezoneOffset = module.exports.getTimeZoneOffSet(timezone, date);
        date.setHours(constants.availability_starting_hour, 0, 0, 0);
        date.setMinutes(date.getMinutes()+(-1)*differenceOfTimezoneOffset);
        date.setDate(date.getDate()+day);
        return date;
    },
    getLastSunday(d) {
      var t = new Date(d);
      t.setDate(t.getDate() - t.getDay());
      return t;
    },

    date_diff_indays(date1, date2) {
      dt1 = new Date(date1);
      dt2 = new Date(date2);
      return Math.floor((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate()) ) /(1000 * 60 * 60 * 24));
    },

    getFourteenDaysAvailability(timezone, days) {
      let user_date = module.exports.getUTCDateForAvailabilityArray(timezone, 1);
      let availability = [];
      for(let i = 1; i < (constants.availability_number_of_days-days); i++){
        for(let j = 0; j < 32; j++) {
          availability.push({...{
              forced: false,
              attendee: false,
              status: false,
              appointment: true,
              quartr_now: false
            }, ...{
              date: user_date.toISOString(),
              timestamp: new Date(user_date)
            }});
          user_date.setMinutes(user_date.getMinutes()+15);
        }
        user_date = module.exports.getUTCDateForAvailabilityArray(timezone, i + 1);
      }
      return availability;
    },

    getFourteenDaysAvailabilityFromToday(timezone) {
      return module.exports.getFourteenDaysAvailability(timezone, 0);
    },

    getFourteenDaysAvailabilityFromLastSunday(timezone) {
      let today = new Date();
      let lastSunday = module.exports.getLastSunday(new Date());
      let day_diff = module.exports.date_diff_indays(lastSunday, today);
      return module.exports.getFourteenDaysAvailability(timezone, day_diff);
    },

    updateUser: (user) => {
        return User.findOne({user_fb_id: user.user_fb_id})
            .then((userfound) => {
                if (userfound.availability && user.availability.length) console.log(userfound.availability[0])
                user = _.omit(user, ['full_name', 'email', 'dob', 'user_code', 'user_number_in_users', 'rating', 'reviews_count', 'rate_change_count', 'available', 'apparently_available', 'referrer_is_set', 'payment_is_set', 'payout_is_set', 'next_quarter_available']);
                if (!user.set_referrer || userfound.referrer_is_set == 1) {
                    user = _.omit(user, ['referrer']);
                } else if (user.set_referrer == 1 && user.referrer && userfound.referrer_is_set == 0) {
                    user.referrer_is_set = 1;
                    user.referrer = user.referrer.toUpperCase()
                } else if (user.set_referrer == 1 && !user.referrer && userfound.referrer_is_set == 0) {
                    user = _.omit(user, ['referrer']);
                    user.referrer_is_set = 1;
                    //referrer notification to the user whom referrer code is given
                }
                // if (user.rate) {
                // if (userfound.rate_change_count < 4) {
                    user.rate_change_count = userfound.rate_change_count + 1;
                // } else {
                //     user = _.omit(user, ['rate']);
                // }
                // } else {
                //     user = _.omit(user, ['rate']);
                // }

                if (userfound.profile_media_urls.length <= 0 && !user.profile_media_urls) {
                    user.profile_media_urls = [];
                    user.profile_media_urls[0] = process.env.BASE_URL + "uploads/default_pic.png";
                    user.profile_media_urls[1] = process.env.BASE_URL + "uploads/default_pic.png";
                    user.profile_media_urls[2] = process.env.BASE_URL + "uploads/default_pic.png";
                }
                console.log("Going to update user");
                console.log(user);
                return User.findOneAndUpdate({user_fb_id: user.user_fb_id}, user, {new: true})
                    .then(async (updateduser) => {
                        if (user.set_referrer == 1 && user.referrer && userfound.referrer_is_set == 0) {
                            var userReferrar = await User.findOne({user_code: user.referrer});
                            await notification.sendNotification(notificationtexts.referrer.type, updateduser.full_name + " has joined and used your code.  You will get 1% of their revenue.", userReferrar._id.toString(), updateduser._id.toString(), updateduser.full_name + " " + notificationtexts.referrer.title, JSON.stringify(userReferrar));
                        }
                        var jwt = require('jsonwebtoken');
                        var token = module.exports.getToken(updateduser);
                        let now = new Date();
                        updateduser.availablility = updateduser.availablility.filter((x)=>{
                          return x.appointment && !x.forced && x.timestamp > now
                        });
                        module.exports.manipulateUserToNullArraysForAndroid(updateduser);
                        var obj = {};
                        obj.user = updateduser;
                        obj.token = token;
                        return obj;
                    })
                    .catch(err => {
                        console.log(err);
                        return err
                    })
            })
            .catch(err => {
                console.log(err);
                return err
            });
    },

    updateAvailability: (body, user_token) => {
        return User.findOne({_id: user_token.d})
            .then((userfound) => {
                if (userfound) {
                    let quartr_now_array = userfound.availablility.filter((x)=>x.quartr_now);
                    let hashMap = {};
                    for (let i = 0; i < quartr_now_array.length; i++) {
                      hashMap[quartr_now_array[i].date] = quartr_now_array[i];
                      hashMap[quartr_now_array[i].date].removed = false;
                    }

                    let availablility = body.availablility;
                    for (let i = 0; i < availablility.length; i++) {
                      if(hashMap[availablility[i].date]) {
                        availablility[i].quartr_now = true;
                        availablility[i].appointment = true;
                        hashMap[availablility[i].date].removed = true;
                      } else {
                        availablility[i].appointment = true;
                        availablility[i].quartr_now = false;
                      }
                    }

                    // console.log(availablility[0].timestamp);
                    // if(!availablility[0].timestamp) {
                    //     return promise.reject('Timestamp not defined');
                    // }

                    if (body.append) {
                        let toRemove = [];

                        for (let hm in hashMap) {
                          if(hashMap[hm].removed) {
                            delete hashMap[hm].removed;
                            toRemove.push(hashMap[hm]);
                          }
                        }
                      return User.findOneAndUpdate({_id: user_token.d}, {
                        $pull: {
                          availablility: {
                            $in: toRemove
                          }
                        }
                      }, {new: true}).then((junk_removed)=>{
                        return User.findOneAndUpdate({_id: user_token.d}, {
                          $push: {
                            availablility: {
                              $each: availablility
                            }
                          }
                        }, {new: true})
                      }).catch((err)=>{
                        console.log("Junk Removed error");
                        console.log(err);
                        return err;
                      });
                    } else {
                        for (let hm in hashMap) {
                          if (!hashMap[hm].removed) {
                            let avlblty = Object.assign(hashMap[hm]);
                            avlblty.appointment = false;
                            availablility.push(avlblty);
                          }
                        }
                        return User.findOneAndUpdate({_id: user_token.d}, {availablility: availablility}, {new: true})
                    }
                } else {
                    return false;
                }
            })
            .catch(err => {
                return err
            });
    },

    deleteuser: (email) => {
        return User.findOneAndRemove({email: email})
            .then((removeduser) => {
                return removeduser;
            })
            .catch(err => {
                return err
            });
    },

    getuseravailability: (user_fb_id) => {
        return User.findOne({user_fb_id: user_fb_id}, {availablility: 1})
            .then((availablility) => {
              let now = new Date();
              availablility = availablility.filter((x)=>{
                return x.appointment && !x.forced && x.timestamp > now
              });
              return availablility;
            })
            .catch(err => {
                return err
            });
    },

    getToken: (user) => {
        var jwt = require('jsonwebtoken');
        var token = jwt.sign({
            n: user.full_name,
            e: user.email,
            d: user._id,
            fb: user.user_fb_id,
            c: user.user_code,
            p: user.profile_media_urls[0],
            r: '_c',
            ak: config.S_THREE_ACCESS_KEY,
            sk: config.S_THREE_SECRET_KEY,
            bn: config.S_THREE_BUCKET_NAME,
        }, process.env.JWT_SECRETE);
        return token;
    },

    generateToken: (user) => {
        return new Promise((res, rej)=> {
            var jwt = require('jsonwebtoken');
            var token = jwt.sign({
                n: user.username,
                e: user.email,
                d: user._id,
                p: user.phone,
                r: user.role,
            }, process.env.JWT_SECRETE);
            res(token);
        })
    },

    getUserFromId: (id, token) => {
        return User.findOne({user_fb_id: id}, {fcm_tokens: 0})
            .then((user) => {
              let now = new Date();
              if (user._id.toString() === token.d) user.availablility = user.availablility.filter((x)=> {
                return x.appointment && !x.forced && x.timestamp > now
              });
              return user;
            })
            .catch(err => {
                return err
            });
    },

    getprofilefromreferralcode: (code) => {
        return User.findOne({user_code: code.toUpperCase()}, {fcm_tokens: 0})
            .then((user) => {
                console.log(user);
                return user;
            })
            .catch(err => {
                return err
            });
    },

    getmysuccessfulinvites: (code, page) => {
      let skip = (page - 1) * pageSize;
      return Promise.all([User.find({referrer: code}, {fcm_tokens: 0}).sort({'created_at': -1}).skip(skip).limit(pageSize).lean(), User.count({referrer: code})])
        .then((results) => {
          console.log(results);
          return {
            users: results[0],
            total: results[1],
            page,
            totalPages: Math.ceil(results[1] / pageSize),
            pageSize
          };
        })
        .catch(err => {
          return err
        });
    }

};
