var api = require('instagram-node').instagram(),
  User = require('./UserController'),
  _ = require('lodash');

exports.getDefaultFeed = function(req, res) {
  var accessToken = req.query.access_token,
    userId = req.query.user_id || '',
    next_max_id = req.query.max_id || null,
    options = {
      count: 33,
      max_id: next_max_id
    };

  if (!accessToken) {
    return res.status(500).json();
  }

  if (!userId) {
    return res.status(500).json();
  }

  api.use({
    access_token: accessToken
  });
  var feed = function(err, medias, pagination, remaining, limit) {
    if (err) {
      return res.status(500).json(err);
    } else {

      User.getViewedMedia(userId, function(err, viewed) {

        if (!err) {

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

function filterViewedAndLikedMediaFromFeed (feed, viewed) {

  var mediaIdList = _.map(viewed, function (item) {
    return item.media_id;
  });

  feed = _.filter(feed, function (item) {

    var isInViewed,
      isAlreadyLiked = item.user_has_liked;

    if(isAlreadyLiked) {
      return false;
    } else {
      isInViewed = mediaIdList.indexOf(item.id) > 0;
      if(isInViewed) {
        return false;
      }
    }

    return true;

  });

  return feed;

}


