var express = require('express');
var api = require('instagram-node').instagram();
var app = express();
var mongoDao = require('./MongoClient');

api.use({
  client_id: '01aa43eeb22142ed8ea8819adfaee95a',
  client_secret: '02408ca932d844f194ddbb2b5c9783ae'
});

var redirect_uri = 'http://localhost:1337/handleauth';
//var redirect_uri = 'http://ec2-54-148-28-246.us-west-2.compute.amazonaws.com:1337/';

exports.authorize_user = function (req, res) {
  res.redirect(api.get_authorization_url(redirect_uri, {
    scope: ['basic', 'comments', 'relationships', 'likes']
  }));
};

exports.handleauth = function (req, res) {
  api.authorize_user(req.query.code, redirect_uri, function (err, result) {
    if (err) {
      console.log(err.body);
      res.send('Didn\'t work');
    } else {
      console.log('Yay! Access token is ', result);
      res.send('You made it!!');
    }
  });
};

exports.testConnect = function (req, res) {
  mongoDao.connectToDb();
  res.send('Connected');
}

// This is where you would initially send users to authorize
app.get('/authorize_user', exports.authorize_user);

// This is your redirect URI
app.get('/handleauth', exports.handleauth);

// This is your redirect URI
app.get('/testconnect', exports.testConnect);

app.listen(1337, function () {
  console.log('Express server listening on port ' + 1337);
});