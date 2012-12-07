#!/usr/local/bin/node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Module dependencies.
require('../../lib/extensions/number');

const 
env         = require('../../lib/environment'),
express     = require('express'),
logger      = require('../../lib/logger'),
util        = require('util'),
redisUrl    = require('redis-url'),
connect     = require('connect'),
RedisStore  = require('connect-redis')(connect),
engine      = require('ejs-locals'),
application = require('./controllers/application');

var http = express();

var sessionStore = new RedisStore({
  client: redisUrl.connect(),
  maxAge: (30).days
});

// Express Configuration
http.configure(function(){
  // logger.debug(__dirname + '/views');
  // process.exit(0);
  http.set('views', __dirname + '/views');
  http.set('view engine', 'ejs');
  http.engine('ejs', engine);


  http.use(express.logger());
  http.use(express.static(__dirname + '/public'));
  http.use(express.cookieParser());
  http.use(express.bodyParser());
  http.use(express.methodOverride());
  //TODO: Load secret from config/env var
  http.use(connect.session({
    secret: env.get("SESSION_SECRET"),
    store: sessionStore,
    cookie: {maxAge: (365).days()}
  }));

  http.use(function (req, res, next) {
    res.removeHeader("X-Powered-By");
    next();
  });

  http.use(http.router);
  require("express-persona")(http, {
    audience: env.get("PERSONA_AUDIENCE")
  });
});

http.configure('development', function(){
  http.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

http.configure('production', function(){
  http.use(express.errorHandler());
});

// HTTP Routes
routes = {
  site: require('./controllers/site')
};

http.get( '/',                                  routes.site.index);
http.get( '/refresh', application.authenticate, routes.site.refresh);
http.get( '/next',    application.authenticate, routes.site.next);
http.post('/make',    application.authenticate, routes.site.updateMake);

process.on('uncaughtException', function(err) {
  logger.error(err);
});

var port = env.get("PORT");
http.listen(port);

logger.info("HTTP server listening on port " + port + ".");
