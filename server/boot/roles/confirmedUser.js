'use strict'

/**
 * @title confirmedUser Role
 * @description this role will check profile completitaion keys include first name and last name
 * @author Aref Mirhosseini <code@arefmirhosseini.com> (http://arefmirhosseini.com)
 * @date Wed Nov 30 2016
 */

var debug = require('debug')('narengi:role:confirmedUser');
var async = require('async');

module.exports = function(app) {
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;
    var Account = app.models.Account;

    Role.registerResolver('confirmedUser', function(role, context, cb) {
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

        Account.findById(accountId, function (err, account) {
            var isValid = true;
            if (account && account.user_profile) {
                isValid = isValid && account.user_profile.firstName && account.user_profile.firstName.trim().length > 0;
                isValid = isValid && account.user_profile.lastName && account.user_profile.lastName.trim().length > 0;
                if (Boolean(isValid)) {
                    cb(null, true)
                } else {
                    var err = new Error();
                        err.status = 403;
                        err.message = "user profile is not completed";
                    cb(err);
                }
            } else {
                var err = new Error();
                    err.status = 400;
                    err.message = "unauthorized";
                cb(err);
            }
            
        });

    });
};
