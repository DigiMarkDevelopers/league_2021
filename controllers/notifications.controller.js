const mongoose = require("mongoose");
const admin = require("firebase-admin");
const config = require('dotenv').config();
const constants = require("../constants");

const responseHelper = require("../helpers/response.helper");

// models
const Notification = mongoose.model("Notification");
const User = mongoose.model("users");

const notificationtexts = require("../constants").notification_texts;
//helper functions
logger = require("../helpers/logger");

const pageSize = parseInt(config.PAGE_SIZE);
const titles = {};
const messages = {
  markedAsRead: "Notification(s) have been marked as read",
  sent: "Notification has been sent successfully",
  removed: "Notification(s) removed successfully",
  fetched: "Notifications fetched successfully",
};

// provide "notificationIds" array in body, otherwise it will mark all notifications as read
var markAsRead = async (req, res) => {
  try {
    var myId = req.token_decoded.d;

    var query = { userId: myId, isRead: false };
    var update = { isRead: true };
    var options = { multi: true, new: true };

    var notificationIds = req.body.notificationIds;
    if (notificationIds && notificationIds.length) {
      query['_id'] = { $in: notificationIds };
    }

    var result = await Notification.update(query, update, options);

    responseHelper.success(res, result, messages.markedAsRead);
  } catch (error) {
    responseHelper.systemfailure(res, error);
  }
};

// mark notification as read based on "targetId" provided in params
var markAsReadByTargetId = async (req, res) => {
  try {
    var myId = req.token_decoded.d;
    var targetId = req.params.targetId;

    var query = { userId: myId, targetId };
    var update = { isRead: true };
    var options = { multi: true, new: true };

    var result = await Notification.update(query, update, options);

    responseHelper.success(res, result, messages.markedAsReads);
  } catch (error) {
    responseHelper.systemfailure(res, error);
  }
};

// provide "notificationIds" array in body, otherwise it will delete all notifications
var deleteNotifications = async (req, res) => {
  try {
    var myId = req.token_decoded.d;

    var query = { userId: myId };

    var notificationIds = req.body.notificationIds;
    if (notificationIds && notificationIds.length) {
      query['_id'] = { $in: notificationIds };
    }

    var result = await Notification.remove(query);

    responseHelper.success(res, result, messages.removed);
  } catch (error) {
    responseHelper.systemfailure(res, error);
  }
};

var getNotifications = async (req, res) => {
  try {
    var myId = req.token_decoded.d;

    var page = req.query.page ? parseInt(req.query.page) : 1;
    var skip = (page - 1) * pageSize;

    var query = { userId: myId };

    if (req.query.unread === "true") {
      query.isRead = false;
    }

    await Notification.update(query, { $set: { isRead: true } }, { multi: true });

    var [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).populate('userId', constants.selectUsersData).populate('targetId', constants.selectUsersData).lean(),
      Notification.count(query),
      Notification.count({ isRead: false, userId: myId })
    ]);

    responseHelper.success(res, { notifications, unreadCount, total, page, totalPages: Math.ceil(total / pageSize), pageSize }, messages.fetched);
  } catch (err) {
    // return res.status(500).json(respObj.internalError(err));
    responseHelper.systemfailure(res, err);
  }
};

var sendNotification = (type, message, userId, targetId, title = "", data = "") => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(type);
      console.log("in send notification");
      title = title || titles[type];

      if (!title) return reject("Title of notification must be specified");

      var notifData = {
        userId,
        targetId,
        type,
        message,
        title,
        data: data
      };

      var newNotification = new Notification(notifData);
      await newNotification.save();
      await sendNow(type, title, message, userId, targetId, newNotification._id.toString(), data)
      resolve(newNotification);
    } catch (error) {
      reject(error);
    }
  });
};

var sendNow = (type, title, message, userId, targetId, notificationId, data="") => {
  return new Promise(async (resolve, reject) => {
    try {

      var results = await Promise.all([
        User.findById(userId).lean(),
        Notification.count({ userId, isRead: false })
      ]);

      var user = results[0];
      var badge = results[1];

      if (!user) {
        return reject("User not found");
      }

      if (!user.fcm_tokens) {
        logger.info("No fcm_tokens found against this user");
        return resolve("No fcm_tokens found against this user");
      }

      targetId = targetId || "";

        var androidData = {
          type,
          notificationId,
          targetId: targetId.toString(),
          title,
          body: message,
          // click_action: type,
          badge: badge.toString(),
          data: data.toString()
        };

        var iosData = {
          type,
          notificationId,
          targetId: targetId.toString()
        };

        var payload = {};

        if (user.fcm_tokens.deviceType === 'android') {
        // if (true) {
          payload = { notification: androidData };
          var options = { priority: "high", timeToLive: 60 * 60 * 24 };
          var response = await admin.messaging().sendToDevice(user.fcm_tokens.token, payload, options)

          console.log(response);
          console.log('\n');
          console.log(response.successCount ? "Following notification SENT successfully:" : 'Following notification FAILED:');
          // console.log(tokenObj.token);
          console.log(title, message);

          if (response.results && response.results[0].error) {
            console.log(response.results[0].error);
          }

          // }
          resolve(messages.sent);
        } else {
          payload = {
            data: iosData,
            notification: {
              title,
              body: message,
              click_action: type,
              badge: badge.toString(),
              data: data.toString(),
            }
          };
          var options = { priority: "high", timeToLive: 60 * 60 * 24 };
          var response = await admin.messaging().sendToDevice(user.fcm_tokens.token, payload, options)

          console.log(response);
          console.log('\n');
          console.log(response.successCount ? "Following notification SENT successfully:" : 'Following notification FAILED:');
          // console.log(tokenObj.token);
          console.log(title, message);

          if (response.results && response.results[0].error) {
            console.log(response.results[0].error);
          }

          // }
          resolve(messages.sent);
        }



    } catch (error) {
      reject(error);
    }
  });
};

var sendSampleNotificationToAll = async (req, res) => {
  try {
    console.log("Sending notification to all");
    var users = await User.find({}, { fcm_tokens: 1, username: 1 }).lean();
    console.log(users);
    for (let user of users) {
      if (user.fcm_tokens && user.fcm_tokens.token) {
        console.log(user);
        sendNotification('welcome', "Welcome to Leagr App", user._id.toString(), user._id.toString(), `Hi ${user.username}!`);
      }
    }

    responseHelper.success(res, {}, "Sample notifications sent to all users");
  } catch (error) { responseHelper.systemfailure(res, error); }
}

var getUnreadCount = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      resolve(await Notification.count({ userId, isRead: false }));
    } catch (error) {
      reject(error);
    }
  });
}

var enableOrDisableNotifications = async (req, res) => {
  try {
    var myId = req.token_decoded.d;
    var toUpdate = {
      enable_invite_notification: req.body.enable_invite_notification,
      enable_review_notification: req.body.enable_review_notification
    };
    var users = await User.findOneAndUpdate({_id: myId}, toUpdate, {new: true});

    responseHelper.success(res, {}, "successfully done");
  } catch (error) { responseHelper.systemfailure(res, error); }
};

module.exports = {
  getUnreadCount,
  sendSampleNotificationToAll,
  sendNow,
  markAsRead,
  markAsReadByTargetId,
  deleteNotifications,
  sendNotification,
  getNotifications,
  enableOrDisableNotifications,
};
