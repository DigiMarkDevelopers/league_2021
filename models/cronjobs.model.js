var mongoose = require('mongoose')
    ,Schema = mongoose.Schema,
cronjobsSchema = new Schema( {
    name: { type: String, required: true, unique: true},
	data: Schema.Types.Mixed,
    priority: Number,
    type: String,
    nextRunAt: Date,
    lastModifiedBy: String,
    lockedAt: Date,
    lastRunAt: Date,
    lastFinishedAt: Date
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
}), cronjobs = mongoose.model('cronjobs', cronjobsSchema);
module.exports = cronjobs;