//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var debug = require('debug')('narengi:role:houseOwner');

module.exports = function (app) {
    var Role = app.models.Role;
    Role.registerResolver('houseOwner', function (role, context, cb) {
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
        context.model.findById(context.modelId, function (err, house) {
            if (err)
                return reject(err);
            if (!house)
                return reject(require('narengi-utils').Persistency.Errors.NotFound());

            house.__get__owner(function (ex, owner) {
                if (!owner)
                    return cb(null, false);

                app.models.Account.count({
                    personId: owner.id,
                    id: userId
                }, function (err, count) {
                    if (err)
                        return reject(err);
                    cb(null, count > 0);
                });
            });
        });
    });
};