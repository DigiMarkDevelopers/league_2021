var mongoose = require('mongoose');
var Schema = mongoose.Schema;
teamsSchema = new Schema({
        players: [{
            type: Schema.Types.ObjectId,
            required: true,
            ref: "users"
        }],
        captain: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "users"
        },
        image: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
            unique: true
        },
        is_active: {
          type: Boolean,
          default: true
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
},
{
        timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}
});

module.exports = mongoose.model('teams', teamsSchema);
