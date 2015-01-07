var api = require('instagram-node').instagram(),
  UserCtrl = require('./UserController'),
  GroupCtrl = require('./GroupController'),
  mongoose = require('mongoose'),
  Group = mongoose.model('Group'),
  _ = require('lodash'),
  Q = require('q');

exports.getDefaultFeed = function(req, res) {
  var accessToken = req.query.access_token,
    userId = req.query.user_id || '',
    maxId = req.query.max_id || null,
    options = {
      count: 33,
      max_id: maxId
    };

  if (!accessToken) {
    return res.status(500).json();
  }

  if (!userId) {
    return res.status(500).json();
  }

  api.use({
    access_token: accessToken
  })
  var feed = function(err, medias, pagination, remaining, limit) {
    if (err) {
      return res.status(500).json(err);
    } else {

      UserCtrl.getViewedMedia(userId, function(err, viewed) {

        if (!err && viewed) {


          medias = filterViewedAndLikedMediaFromFeed(medias, viewed);

        }

        var response = {
          data: medias,
          next_max_id: pagination.next_max_id
        };

        return res.status(200).json(response);

      });

    }
  };

  api.user_self_feed(options, feed);
};

exports.getCustomFeed = function(req, res) {
  var accessToken = req.body.access_token,
    userId = req.body.user_id || '',
    groupName = req.body.group_name || '',
    nextSet = ((req.body.next === '1') ? true : false),
    nextSetMap = req.body.next_set,
    memberPromise,
    memberList = [];



  memberPromise = GroupCtrl.getGroupMembers(userId, groupName);
  memberPromise.then(function(data) {

    memberList = data.memberList;
    getMediaForMemberList(groupName, userId, memberList, accessToken, nextSet, nextSetMap, function(err, feed) {


      if (err) {
        return res.status(500).json();
      }

      UserCtrl.getViewedMedia(userId, function(err, viewed) {

        if (!err && viewed) {

          medias = filterViewedAndLikedMediaFromFeed(feed, viewed);
          nextSetMapArray = generateMemberToTimestampHash(feed);
          console.log('Last fetched: ', nextSetMapArray);

          if (_.isEmpty(medias)) {
            req.body.next_set = nextSetMapArray;
            req.body.next = '1';
            return exports.getCustomFeed(req, res);
          }

        }

        var response = {
          next_set: nextSetMapArray,
          data: medias
        };

        console.log('Response: ', medias.length);

        return res.status(200).json(response);

      });

    });


  }, function() {

    return res.status(500).json();

  });
};

function generateMemberToTimestampHash(medias) {
  var map = {};

  _.each(medias, function(item) {
    map[item.user.id] = item.created_time;
  });

  return map;
}

function filterViewedAndLikedMediaFromFeed(feed, viewed) {

  var mediaIdList = _.map(viewed, function(item) {
    return item.media_id;
  });

  feed = _.filter(feed, function(item) {

    var isInViewed,
      isAlreadyLiked = item.user_has_liked;

    if (isAlreadyLiked) {
      return false;
    } else {
      isInViewed = mediaIdList.indexOf(item.id) > 0;
      if (isInViewed) {
        return false;
      }
    }

    return true;

  });

  return feed;

}


function getMediaForMemberList(groupName, userId, memberList, accessToken, nextSet, nextSetMap, callback) {

  var promiseArray = [],
    mediaPromise,
    member,
    medias = [];

  for (var i = 0; i < memberList.length; i++) {

    member = memberList[i];
    if (nextSet && nextSetMap && nextSetMap[member.user_id]) {
      member.latest_media_timestamp = ((parseInt(nextSetMap[member.user_id]) - 1) + '');
    } else if (member.latest_media_timestamp) {
      member.latest_media_timestamp = ((parseInt(member.latest_media_timestamp) + 1) + '');
    }

    mediaPromise = getMediaForMember(member.user_id, member.latest_media_timestamp, accessToken, nextSet);
    promiseArray.push(mediaPromise);

  }

  Q.all(promiseArray).done(function(dataList) {

    medias = constructDataFromRawResponse(dataList);
    if (!nextSet) {
      saveFetchedDataNewestTimestamp(groupName, userId, dataList);
    }
    callback(null, medias);

  }, function(err) {
    callback(err);
  });
}

function saveFetchedDataNewestTimestamp(groupName, userId, userDataArray) {
  var promiseArray = [],
    timestamp = '',
    promise;

  for (var i = 0; i < userDataArray.length; i++) {

    timestamp = userDataArray[i][0].created_time;
    member_id = userDataArray[i][0].user.id;

    Group.update({
      'group_name': groupName,
      'user_id': userId,
      'members.user_id': member_id,
      'members.latest_media_timestamp': {
        $lt: timestamp
      }
    }, {
      $set: {
        'members.$.latest_media_timestamp': timestamp
      }
    }, {
      upsert: true,
      multi: true
    }, function() {});

  }
}

function constructDataFromRawResponse(dataListArray) {
  var flattenedArray = _.flatten(dataListArray),
    sortedArray = [];

  console.log('Total: ', dataListArray.length, dataListArray[0].length, dataListArray[1].length);

  //Sort by timestamp and get the media with highest timestamp (latest) on top
  sortedArray = _.sortBy(flattenedArray, 'created_time').reverse();

  return sortedArray;

}

function getMediaForMember(memberId, latestMediaTimestamp, accessToken, nextSet) {

  var deferred = Q.defer(),
    options = {
      count: 5,
      max_timestamp: latestMediaTimestamp || ''
    };

  if (!nextSet || !options.max_timestamp) {
    delete options.max_timestamp;
  }

  console.log(nextSet, memberId, options.max_timestamp);

  api.use({
    access_token: accessToken
  });


  api.user_media_recent(memberId, options, function(err, medias, remaining, limit) {

    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(medias);
    }

  });
  return deferred.promise;
}