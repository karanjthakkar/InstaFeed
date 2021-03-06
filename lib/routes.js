'use strict';

var groups = require('./controllers/GroupController'),
  users = require('./controllers/UserController'),
  feed = require('./controllers/FeedController'),
  authenticate = require('./controllers/AuthenticationController');

/**
 * Application routes
 */
module.exports = function(app) {

  // Server API Routes

  // Authorize users on this link
  app.get('/authorize_user', authenticate.authorizeUser);

  // Redirect URI after authorization
  app.get('/login_complete', authenticate.handleAuth);

  // Get feed based on group names
  app.get('/default_feed', feed.getDefaultFeed);

  // Get feed based on group names
  app.post('/custom_feed', feed.getCustomFeed);

  //Like a media or discard a media
  app.post('/like_discard', users.likeOrDiscardMedia);

  //Get user updated profile
  app.get('/user_profile', users.getUpdatedUserProfile);

  //Get user updated profile
  app.get('/following_list', users.getFollowingList);

  // Get feed based on group namesusers group list
  app.get('/groups/list', groups.getGroupList);

  // Create a group
  app.post('/groups/create', groups.createGroup);

  // Delete a group
  app.post('/groups/delete', groups.deleteGroup);

  // Add user/users to group
  app.post('/members/add', users.addMemberToGroup);

  // Remove user/users from group
  app.post('/members/delete', users.removeMemberFromGroup);
};