//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var app = serverRequire('server');
var security = require('narengi-utils').Security;
var PromiseCallback = require('narengi-utils').Common.PromiseCallback;

module.exports = function (Model, options) {

    var Role = app.models.Role;

    /**
     * Check if current user is admin or not
     */
    Model.IsCurrentAdminSync = function () {
        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx.get('currentUser');
        if(!currentUser) return false;
        return Model.IsAdmin(currentUser.username || currentUser.email);
    };

    /**
     * Check if current user is admin or not
     */
    Model.IsCurrentAdmin = function (cb) {
        cb = cb || PromiseCallback();
        Model.IsCurrentAdminSync().then((result) => {cb(null, result);}).catch((e) => {cb(e);});
        return cb.promise;
    };

    /**
     * Check if specified user is admin or not
     */
    Model.IsAdminSync = function (userPrincipal) {
        return security.Common.isUserAdmin(userPrincipal);
    };

    /**
     * Check if specified user is admin or not
     */
    Model.IsAdmin = function (userPrincipal, cb) {
        cb = cb || PromiseCallback();
        Model.IsAdminSync(userPrincipal).then((result) => {cb(null, result);}).catch(() => {cb(null, "false");});
        return cb.promise;
    };
};