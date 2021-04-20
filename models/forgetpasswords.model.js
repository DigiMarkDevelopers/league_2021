var mongoose = require('mongoose');
var Schema = mongoose.Schema;

forgetpasswordsSchema = new Schema({
    user: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      required: true,
      default: false
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
      match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    }
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

forgetpasswordsSchema.methods.setToken = function (token) {
    this.token = crypto.createHash('sha1').update(token).digest("hex");
};

module.exports = mongoose.model('forgetpasswords', forgetpasswordsSchema);
