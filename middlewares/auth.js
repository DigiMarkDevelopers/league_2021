var jwt = require('jsonwebtoken');
module.exports.authenticate =(req, res, next) => {
    var authorization = req.header('Authorization');
    var responseHelper = require('../helpers/response.helper');
    if (authorization) {
        var token = authorization.split(' ');
            jwt.verify(token[1], process.env.JWT_SECRETE, function(err, token_decoded) {
                if (err) {
                    return responseHelper.requestfailure(res, 'Failed to authenticate token.');
                        } else {
                        req.token_decoded = token_decoded;
                        next();
                }
            });
    } else {
        res.sendStatus(401);
    }
};
