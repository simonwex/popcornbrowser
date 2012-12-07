/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

exports.user = function(req){
  if (req.session.email != null){
    return {
      'email': req.session.email
    }
  }
  return null;
};
