const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var timestamps = require("mongoose-timestamp");

const ACSchema = new Schema({
    as: {
        type: Boolean,
        default: true
    }
});

ACSchema.plugin(timestamps);

const ACModel = mongoose.model("AC", ACSchema);

module.exports = ACModel;
