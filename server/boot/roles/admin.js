//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var debug = require('debug')('narengi:role:admin');
var async = require('async');

module.exports = function (app) {
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;
    var Account = app.models.Account;

    Role.registerResolver('ADMIN', function (role, context, cb) {
        function reject(err) {
            if (err) {
                return cb(err);
            }
            cb(null, false);
        }

        debug("model name : %s", context.modelName);

        var authHeader = {};
        if (context.remotingContext) {
            authHeader = (context.remotingContext.req.headers.authorization && JSON.parse("{" + context.remotingContext.req.headers.authorization + "}")) || {};
        }
        debug("authorization header : %j", authHeader);
        debug("context access token : %j", context.accessToken);

        var accountId = context.modelId;
        authHeader.username = authHeader.username || (context.accessToken && context.accessToken.username);
        accountId = accountId || (context.accessToken && context.accessToken.userId);

        async.parallel([
            function (callback) {
                if (authHeader.username) {
                    Account.findByUsernameOrEmail(authHeader.username, callback);
                }
                else if(accountId){
                    Account.findById(accountId, callback);
                }
                else{
                    callback(null, null);
                }
            },
            function (callback) {
                Role.findOne({
                    where: {name: "ADMIN"}
                }, callback);
            }
        ], function (err, result) {
            debug("Error : %j", err);
            if (err) return reject(err);

            debug("Result : %j", result);

            var account = result[0];
            var role = result[1];

            if (!account || !role) return reject();

            RoleMapping.count({
                principalType: RoleMapping.ACCOUNT,
                principalId: account.id.toString(),
                roleId: role.id
            }).then((count) => {
                count = count || 0;
                debug("Role '%s' mapped to account '%s' times", role.name, count);
                cb(null, count > 0);
            }).catch((e) => {
                reject(e);
            });
        });
    });
};