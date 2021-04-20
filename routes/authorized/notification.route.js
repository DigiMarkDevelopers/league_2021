const express = require('express');
const router = express.Router();

const controller = require('../../controllers').notifications;

router.get('/', controller.getNotifications);
router.post('/mark-as-read', controller.markAsRead);
router.post('/mark-as-read/targetId/:targetId', controller.markAsReadByTargetId);
router.post('/clear', controller.deleteNotifications);
router.post('/enable-or-disable-notifications', controller.enableOrDisableNotifications);
router.post('/sample-notification', controller.sendSampleNotificationToAll);

module.exports = router;
