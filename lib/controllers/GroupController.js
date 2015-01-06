var mongoose = require('mongoose'),
  Group = mongoose.model('Group'),
  User = mongoose.model('User'),
  Q = require('q'),
  _ = require('lodash');

exports.createGroup = function(req, res) {
  var groupName = req.body.group_name,
    userId = req.body.user_id;

  //Check if the given user id exists in our db
  User.findOne({
    user_id: userId
  }, function(err, user) {

    if (err || !user) {
      return res.json(403);
    } else {

      exports.checkGroupExists(userId, groupName, function(err) {

        if (err) {
          return res.json(403);
        } else {
          var now = Date.now(),
            groupItemData = _.extend({}, {
              group_name: groupName,
              user_id: userId,
              created_at: now,
              updated_at: now,
              members: []
            });

          var groupItem = new Group(groupItemData);
          groupItem.save(function(err) {
            if (err) {
              return res.json(500);
            } else {
              return res.json(200);
            }
          });
        }

      })
    }

  });
};

exports.deleteGroup = function(req, res) {
  var groupName = req.body.group_name,
    userId = req.body.user_id;

  //Check if the given user id exists in our db
  User.findOne({
    user_id: userId
  }, function(err, user) {

    if (err || !user) {
      return res.json(403);
    } else {

      Group.findOneAndRemove({
        user_id: userId,
        group_name: groupName
      }, function(err, group) {

        if (err) {
          return res.json(403);
        } else if (!group) {
          return res.json(403);
        } else {
          return res.json(200);
        }

      })
    }

  });
};

exports.getGroupList = function(req, res) {
  var userId = req.query.user_id;

  //Check if the given user id exists in our db
  User.find({
    user_id: userId
  }, function(err, user) {

    if (err || !user) {
      return res.json(403);
    } else {

      var query = Group.find({}).select({ //Omit fields that are not important
        '__v': 0,
        '_id': 0,
        'members._id': 0
      });

      query.exec(function(err, groups) {
        if (err) {
          return res.json(500);
        } else {
          return res.status(200).json(groups);
        }
      })

    }

  });

};

exports.getGroupMembers = function(userId, groupName) {

  var deferred = Q.defer(),
    promiseData = {};

  //Check if the given user id exists in our db
  Group.findOne({
    user_id: userId,
    group_name: groupName
  }, { //Omit fields that are not important
    'members.user_id': 1,
    'members.latest_media_timestamp': 1
  }, function(err, group) {
    if (err) {
      promiseData.error = err;
      deferred.reject(promiseData);
    } else {
      promiseData.error = null;
      promiseData.memberList = _.uniq(_.map(group.members, function(item) {
        return {
          user_id: item.user_id,
          latest_media_timestamp: item.latest_media_timestamp || ''
        };
      })); //Generate array of UNIQUE userID's from the database
      deferred.resolve(promiseData);
    }
  })

  return deferred.promise;

};

/* 
 * Check if group exists previously.
 * If yes, stop adding it to the list
 * else, add it.
 */
exports.checkGroupExists = function(userId, groupName, callback) {
  Group.findOne({
    user_id: userId,
    group_name: groupName
  }, function(err, group) {
    if (err || group) {
      callback(true); //TODO error descriptions
    } else {
      callback(null)
    }
  });
}