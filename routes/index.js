const express = require("express");
const router = express.Router();
var auth = require("../middlewares").auth;
var authorizedRoutes = require("./authorized");
var unAuthorizedRoutes = require("./unauthorized");

router.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.status(200).send();
  } else {
    next();
  }
});

router.use(unAuthorizedRoutes, auth.authenticate, authorizedRoutes);

module.exports = router;
