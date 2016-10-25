//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var PersistencyErrors = require('narengi-utils').Persistency.Errors;
var async = require('async');
var loopback = require('loopback');

module.exports = exports;

/**
 * Check is input user is in `ADMIN` role or not
 * @param {Application} app
 * @param {string} usernameOrEmail
 * @returns {Promise}
 */
exports.isUserAdmin = function (usernameOrEmail) {
    var Account = loopback.findModel('Account');
    var Role = loopback.findModel('Role');

    function executor(resolve, reject) {
        async.waterfall([
            function (callback) {
                Account.findByUsernameOrEmail(usernameOrEmail, callback);
            },
            function (account, callback) {
                if(!account) return callback(PersistencyErrors.NotFound());
                Role.isInRole(Role.ADMIN, {
                    model: "Account",
                    modelId: account.id,
                    principalType: "Account",
                    principalId: account.id
                }, function (err, isInRole) {
                    if (err) return callback(null, false);
                    callback(null, isInRole === true);
                });
            }
        ], function (err, result) {
            if (err) return reject(PersistencyErrors.NotFound());
            resolve(result);
        });
    }

    return new Promise(executor);
};
