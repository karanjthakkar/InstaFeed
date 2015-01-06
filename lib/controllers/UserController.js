var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Group = mongoose.model('Group'),
  GroupCtrl = require('./GroupController'),
  Q = require('q'),
  _ = require('lodash'),
  async = require('async'),
  api = require('instagram-node').instagram();

exports.saveNewUserData = function(userData) {

  var userItemData = _.extend({}, {
    access_token: userData.access_token,
    user_id: userData.user.id,
    updated_at: Date.now()
  }, userData.user);

  var userItem = new User(userItemData);

  //Update user details in user collection
  User.update({
    user_id: userItemData.user_id
  }, userItemData, {
    upsert: true,
    overwrite: true
  }, function(err, numberAffected, raw) {
    if (err) {
      console.log('Error while saving data for: ' + userItemData.full_name);
      console.log(err);
    } else {
      console.log('Update user collection for: ' + userItemData.full_name);
      console.log('Access Token: ', userData.access_token);
    }
  });
};

exports.getViewedMedia = function (userId, callback) {

  User.findOne({
    user_id: userId
  }, function (err, user) {

    if (err) {
      callback(err);
    } else {
      var viewed = user.viewed || [];
      callback(null, viewed);
    }

  })

};

exports.likeOrDiscardMedia = function(req, res) {

  var userId = req.body.user_id,
    accessToken = req.body.access_token,
    mediaId = req.body.media_id,
    action = req.body.action; //Can be 'like' or 'discard'

  if (action === 'like') {

    addLike(accessToken, mediaId, function(err) {

      if (err) {
        return res.status(500).json();
      } else {
        updateInUserCollection('like', mediaId, userId, function(err) {
          if (err) {
            return res.status(500).json();
          } else {
            return res.status(200).json();
          }
        });
      }

    });


  } else {

    updateInUserCollection('discard', mediaId, userId, function(err) {
      if (err) {
        return res.status(500).json();
      } else {
        return res.status(200).json();
      }
    });

  }

};

exports.getUpdatedUserProfile = function(req, res) {
  var userId = req.query.user_id,
    accessToken = req.query.access_token,
    userPromise,
    savePromise;

  userPromise = getUserProfile(userId, accessToken);
  userPromise.then(function(data) {

    savePromise = saveExistingUserData(data.userProfile); //Save data in db
    savePromise.then(function(data) {
      return res.status(200).json(data.userProfile); //Send data to user
    }, function() {
      return res.status(500).json(); //Send data to user
    });

  }, function(data) {

    return res.status(500).json();

  });
};

exports.getFollowingList = function(req, res) {

  var userId = req.query.user_id,
    accessToken = req.query.access_token,
    cursor = req.query.cursor || null,
    refresh = !cursor,
    savePromise;

  followListPromise = getFollowingList(userId, accessToken, cursor);
  followListPromise.then(function(data) {

    saveFollowingList(userId, data.followingData, refresh); //Save data in db
    return res.status(200).json(data.followingData); //Send data to user

  }, function() {

    return res.status(500).json();

  });
};

exports.addMemberToGroup = function(req, res) {

  var groupName = req.body.group_name,
    groupMemberData = req.body.members,
    userId = req.body.user_id;

  groupMemberData = appendExtraFieldsToMemberData(groupMemberData);

  //Check if the given user id exists in our db
  User.findOne({
    user_id: userId
  }, function(err, user) {
    if (err || !user) {
      return res.json(403);
    } else {
      Group.update({
        group_name: groupName,
        user_id: userId
      }, {
        $set: {
          updated_at: Date.now()
        },
        $push: {
          members: {
            $each: groupMemberData
          }
        }
      }, {
        upsert: true
      }, function(err, group) {
        if (err || !group) {
          return res.status(500).json();
        } else {
          return res.status(200).json();
        }
      });
    }
  });
};

exports.removeMemberFromGroup = function(req, res) {

  var groupName = req.body.group_name,
    memberIdList = req.body.members,
    userId = req.body.user_id;

  //Check if the given user id exists in our db
  User.findOne({
    user_id: userId
  }, function(err, user) {
    if (err || !user) {
      return res.json(403);
    } else {
      Group.update({
        group_name: groupName,
        user_id: userId
      }, {
        $set: {
          updated_at: Date.now()
        },
        $pull: {
          members: {
            user_id: {
              $in: memberIdList
            }
          }
        }
      }, function(err, group) {
        if (err || !group) {
          return res.status(500).json();
        } else {
          return res.status(200).json();
        }
      });
    }
  });
};


/*Private functions*/
function getUserProfile(userId, accessToken) {

  var deferred = Q.defer(),
    promiseData = {};

  api.use({
    access_token: accessToken
  });
  api.user(userId, function(err, result, remaining, limit) {

    if (err) {

      promiseData.error = err;
      deferred.reject(promiseData);
    } else {

      promiseData.error = null;
      promiseData.userProfile = result;
      deferred.resolve(promiseData);
    }
  });

  return deferred.promise;

}


function getFollowingList(userId, accessToken, cursor) {

  var deferred = Q.defer(),
    promiseData = {},
    options = {
      count: 100,
      cursor: cursor
    };

  api.use({
    access_token: accessToken
  });
  api.user_follows(userId, options, function(err, users, pagination, remaining, limit) {
    if (err) {
      promiseData.error = err;
      deferred.reject(promiseData);
    } else {
      promiseData.error = null;
      promiseData.followingData = {
        list: users,
        next: pagination.next_cursor
      };
      deferred.resolve(promiseData);
    }
  });

  return deferred.promise;

}

function normalizeData(list) {
  list = _.map(list, function(item) {
    item.user_id = item.id;
    delete item.id;
    return item;
  });
  return list;
}

function saveFollowingList(userId, followingData, refresh) {
  var deferred = Q.defer(),
    promiseData = {},
    updateObject = {},
    followingList = normalizeData(followingData.list);

  //Check if list needs to be refreshed. If yes, replace existing followers. Else udpate
  if (refresh) {

    query = User.findOneAndUpdate({
      user_id: userId
    }, {
      $set: {
        updated_at: Date.now(),
        following: followingList //Replace entire following list with new list
      }
    }, {
      upsert: true
    }).select({
      '__v': 0,
      '_id': 0,
      'following._id': 0
    });

  } else {

    query = User.findOneAndUpdate({
      user_id: userId
    }, {
      $set: {
        updated_at: Date.now()
      },
      $push: {
        following: {
          $each: followingList //Update following list by pushing next cursors data
        }
      }
    }, {
      upsert: true
    }).select({
      '__v': 0,
      '_id': 0,
      'following._id': 0
    });
  }

  query.exec(function(err, list) {

    if (err) {
      promiseData.error = err;
      deferred.reject(promiseData);
    } else {
      promiseData.error = null;
      promiseData.followingList = {
        data: list.following,
        next: followingData.next
      };
      deferred.resolve(promiseData);
    }
  });

  return deferred.promise;

}

function addLike(accessToken, mediaId, callback) {
  api.use({
    access_token: accessToken
  });
  api.add_like(mediaId, function(err, remaining, limit) {

    if (err) {
      callback(err);
    } else {
      callback(null);
    }

  });
}

function updateInUserCollection(type, mediaId, userId, callback) {

  var viewedObject = {
    media_id: mediaId,
    type: type,
    created_at: Date.now()
  };

  User.update({
      user_id: userId
    }, {
      $push: {
        viewed: viewedObject
      }
    }, {
      upsert: true
    }, function(err, user) {
      if (err) {
        return callback(err);
      } else {
        return callback(null);
      }
    });

}

function saveExistingUserData(userData) {
  var deferred = Q.defer(),
    promiseData = {},
    userItemData = _.extend({}, {
      user_id: userData.id,
      updated_at: Date.now()
    }, userData),
    userItem = new User(userItemData),
    query;

  //Update user details in user collection
  query = User.findOneAndUpdate({
    user_id: userItemData.user_id
  }, userItemData, {
    upsert: true
  }).select({
    '__v': 0,
    '_id': 0
  });

  query.exec(function(err, user) {
    if (err) {
      console.log('Error saving follow list to db ', err);
    } else {
      console.log('Successfully saved follow list to db.');
    }
  });

  return deferred.promise;
}