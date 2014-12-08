'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * User Schema
 */
var UserSchema = new Schema({
  username: String,
  bio: String,
  website: String,
  profile_picture: String,
  full_name: String,
  user_id: String,
  access_token: String,
  counts: {
    media: String,
    follows: String,
    followed_by: String
  },
  followerCount: String,
  following: [{
    username: String,
    bio: String,
    website: String,
    profile_picture: String,
    full_name: String,
    user_id: String
  }],
  viewed: [{
    media_id: String,
    type: {type: String},
    created_at: String
  }],
  updated_at: Date
});

mongoose.model('User', UserSchema);