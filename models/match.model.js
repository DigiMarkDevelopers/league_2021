var mongoose = require('mongoose');
var Schema = mongoose.Schema;
matchesSchema = new Schema({
        team_a: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "teams"
        },
        team_b: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "teams"
        },
        location: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        date_and_time: {
          type: Date
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        paid_by: [{
            type: Schema.Types.ObjectId,
            required: true,
            ref: "users"
        }],
},
{
        timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}
});

module.exports = mongoose.model('matches', matchesSchema);
