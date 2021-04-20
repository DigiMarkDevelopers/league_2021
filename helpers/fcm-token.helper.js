var mongoose = require('mongoose');
var User = mongoose.model('users');


var clearToken = (userId) => {
	return new Promise(async (resolve, reject) => {
		try {
			var user = await User.findByIdAndUpdate(userId, 
				{ $set: { fcm_tokens: null } },
				{ new: true }
			);
			return resolve(user.fcm_tokens);

		} catch (error) { reject(error.message) }
	});
}


var addToken = (userId, token, deviceType, voipToken) => {
	return new Promise(async (resolve, reject) => {
		try {
			var user = await User.findByIdAndUpdate(userId, 
				{ $set: { fcm_tokens: { deviceType, token, voipToken } } },
				{ new: true }
			)
			return resolve(user.fcm_tokens);
		} catch (error) { reject(error.message) }
	});
}


module.exports = {
	addToken,
	clearToken
}
