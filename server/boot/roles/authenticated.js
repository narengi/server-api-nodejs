//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var debug = require('debug')('narengi-role:authenticated');

module.exports = function (app) {
    var Role = app.models.Role;
    Role.registerResolver('authenticated', function (role, context, cb) {
        function reject(err) {
            if (err) {
                return cb(err);
            }
            cb(null, false);
        }

        debug("model name : %s", context.modelName);

        var userId = context.accessToken.userId;

        debug("context access token : %j", context.accessToken);
        debug("user id : %j", context);

        if(!context || !context.accessToken || !context.accessToken.userId) return reject();

        cb(null, true);
    });
};