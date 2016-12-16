//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var debug = require('debug')('narengi-role:houseOwner');

module.exports = function(app) {
    var Role = app.models.Role;
    Role.registerResolver('houseOwner', function(role, context, cb) {
        function reject(err) {
            if (err) {
                return cb(err);
            }
            cb(null, false);
        }

        debug("model name : %s", context.modelName);

        if (context.modelName !== 'House') {
            // the target model is not `House`
            return reject();
        }

        var userId = context.accessToken.userId;

        debug("context access token : %j", context.accessToken);
        debug("user id : %s", userId);

        if (!userId) {
            return reject(); // do not allow anonymous users
        }
        debug("model id : %s", context.modelId);
        if (!context.modelId) {
            return cb(null, false)
        }
        context.model.findById(context.modelId, function(err, house) {
            debug("err", err);
            if (err) {
                return reject(err);
            }
            if (!house) {
                return reject(require('narengi-utils').Persistency.Errors.NotFound());
            }

            app.models.Account.count({
                personId: house.ownerId,
                id: userId
            }, function(err, count) {
                if (err) {
                    return reject(err);
                }
                debug('is_owner', count > 0);
                cb(null, count > 0);
            });
        });

    });
};
