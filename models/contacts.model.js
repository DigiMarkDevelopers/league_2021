const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var Float = require('mongoose-float').loadType(mongoose, 2);
var timestamps = require('mongoose-timestamp');

const contactsSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "users"
  },
  phone: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  }
});

contactsSchema.plugin(timestamps);
const contactsModel = mongoose.model("contacts", contactsSchema);

module.exports = contactsModel;
