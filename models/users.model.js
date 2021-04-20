var mongoose = require('mongoose');
var Schema = mongoose.Schema;
usersSchema = new Schema({
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            required: true,
            match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        },
        phone: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ['admin', 'user'],
            default: 'user'
        },
        is_verified: {
          type: Boolean,
          default: false
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        password: {
            type: String,
            required: true
        },
        verification_code: {
            type: String,
            required: true,
            default: ""
        },
        team: {
            type: Schema.Types.ObjectId,
            required: false,
            ref: "teams"
        },
        fcm_tokens: {
            token: {
                type: String
            },
            deviceType: {
                type: String,
                enum: ["android", "ios"]
            }
        }
    },
    {
        timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}
    });
usersSchema.methods.setPassword = function (password) {
    this.password = crypto.createHash('sha1').update(password).digest("hex");
};

usersSchema.methods.validPassword = function (password) {
    var hash = crypto.createHash('sha1').update(password).digest("hex");
    return this.password === hash;
};

module.exports = mongoose.model('users', usersSchema);
