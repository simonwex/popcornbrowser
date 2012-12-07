/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var 
logger           = require('./../../../lib/logger'),
knox             = require('knox'),
getUser          = require('../helpers/application').user,
env              = require('./../../../lib/environment'),
pg               = require('pg').native, 
s3               = knox.createClient({
                    key: env.get('AWS_ACCESS_KEY_ID'),
                    secret: env.get('AWS_SECRET_ACCESS_KEY'),
                    bucket: 'org.webmadecontent.popcorn'
                  });

/*
 * GET home page.
 */
exports.index = function(req, res){
  console.log(req.session.email);
  res.render('site/index', { user: getUser(req)});
};

function list(marker, cb){
  // {"Name":"org.webmadecontent.popcorn","Prefix":{},"Marker":{},"MaxKeys":1000,"IsTruncated":true,"Contents"
 
  var opts = {'max-keys': 1000};
 
  if (marker){
    opts['marker'] = marker;
  }

  pg.connect(env.get(env.get('DATABASE_ENV_VAR')), function(err, client){
    s3.list(opts, function(err, data){
      if (err){
        logger.error(err);
        res.render('site/error');
      }
      else{
        var truncated = data['IsTruncated'];
        var lastKey = null;
        var contents = data['Contents'];
        var keys = [];
        var placeholders = [];
        for(var i in contents){
          lastKey = contents[i].Key;
          keys.push(lastKey);
          
          placeholders.push("($" + (placeholders.length + 1) + ")");
        }

        var sql = "INSERT INTO makes(key) \
          SELECT v.* FROM (VALUES " + placeholders.join(",") + ") AS v(key) \
          LEFT JOIN \
            makes \
            ON ( \
              makes.key = v.key \
            ) \
          WHERE makes.key IS NULL";

        client.query(sql, keys, function(err, result){
          if (err){
            console.log("Error inserting keys:" + err);
          }
          console.log(result);
          
          if (truncated){
            list(lastKey, cb);
          }
          else{
            cb();
          }
        });
      }
    });
  });
}

exports.refresh = function(req, res){
  list(null, function(){
    res.render('site/refresh');
  });  
}

exports.updateMake = function(req, res){
  pg.connect(env.get(env.get('DATABASE_ENV_VAR')), function(err, client){
    client.query(
      "UPDATE makes SET looks_like_itu = $1 WHERE key = $2", 
      [(req.body.looksLikeITU == 'true'), req.body.key], 
      function(err, result){
        console.log("updated make " + req.body.key)
        res.write('OK');
        res.end();
      }
    );
  });
}

exports.next = function(req, res){
  pg.connect(env.get(env.get('DATABASE_ENV_VAR')), function(err, client){
    client.query("SELECT * FROM makes WHERE looks_like_itu IS NULL LIMIT 1", function(err, result){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(JSON.stringify(result.rows[0]));
      res.end();
    });
  });
}

