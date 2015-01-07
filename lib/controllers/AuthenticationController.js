var api = require('instagram-node').instagram();
var redirect_uri = 'http://localhost:1337/login_complete';
//var redirect_uri = 'http://ec2-54-148-28-246.us-west-2.compute.amazonaws.com:1337/';
var user = require('./UserController');

var clientOptions = {
  client_id: '01aa43eeb22142ed8ea8819adfaee95a',
  client_secret: '02408ca932d844f194ddbb2b5c9783ae'
};

exports.authorizeUser = function (req, res) {
  api.use(clientOptions);
  res.redirect(api.get_authorization_url(redirect_uri, {
    scope: ['basic', 'comments', 'relationships', 'likes']
  }));
};

exports.handleAuth = function (req, res) {
  api.use(clientOptions);
  api.authorize_user(req.query.code, redirect_uri, function (err, result) {
    if (err) {
      res.send(err);
    } else {
      user.saveNewUserData(result);
      res.send('You made it!!');
    }
  });
};