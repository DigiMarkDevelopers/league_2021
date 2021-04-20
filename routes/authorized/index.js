const express = require('express');
const router = express.Router();

//get defined routes
const usersRoutes = require('./users.route');
const searchRoutes = require('./search.route');
const notificationRoutes = require('./notification.route.js');
const contactRoutes = require('./contacts.route.js');
const teamRoutes = require('./team.route');
const matchRoutes = require('./match.route');


//call appropriate routes
router.use('/users', usersRoutes);
router.use('/search', searchRoutes);
router.use('/notification', notificationRoutes);
router.use('/contact', contactRoutes);
router.use('/team', teamRoutes);
router.use('/match', matchRoutes);

module.exports = router;
