'use strict';

var fs = require('fs'),
  path = require('path'),
  express = require('express'),
  mongoose = require('mongoose'),
  bodyParser = require('body-parser');

/**
 * Main application file
 */

// Connect to database
mongoose.connect('mongodb://ec2-54-148-28-246.us-west-2.compute.amazonaws.com:27017/instafeed');

var app = express();

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// Bootstrap models
var modelsPath = path.join(__dirname, 'lib/models');
fs.readdirSync(modelsPath).forEach(function (file) {
  require(modelsPath + '/' + file);
});

// Routing
require('./lib/routes')(app);

// Start server
app.listen(1337, function () {
  console.log('Express server listening on port 1337');
});

// Expose app
exports = module.exports = app;