/**
 * Created by Mb
 */
 
const express = require('express');
const router = express.Router();

//get defined routes
const userRoutes = require('./user.route');
const notificationRoutes = require('./notification.route.js');

//call appropriate routes
router.use ('/users', userRoutes);
router.use ('/notification', notificationRoutes);

module.exports = router;
