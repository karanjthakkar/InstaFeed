'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * Group Schema
 */
var GroupSchema = new Schema({
  group_name: String,
  created_at: Date,
  updated_at: Date,
  user_id: String,
  members: [{
    username: String,
    bio: String,
    website: String,
    profile_picture: String,
    full_name: String,
    user_id: String
  }]
});

GroupSchema.pre('save', function (next) {
  var now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});

mongoose.model('Group', GroupSchema);