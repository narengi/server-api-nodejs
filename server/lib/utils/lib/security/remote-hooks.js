//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var SecurityErrors = require('./errors');
var CommonErrors = require('narengi-utils').Errors;
var Security = require('./security');


module.exports = exports;

exports.checkCurrentUserIsAdmin = function (ctx, instance, next) {
    var ctx = ctx || LoopBackContext.getCurrentContext();
    if (!ctx) {
        return next(CommonErrors.InternalError());
    }
    var currentUser = ctx.get('currentUser');
    if (!currentUser) {
        return next(SecurityErrors.NotAuthorized());
    }

    Security.isUserAdmin(currentUser.username || currentUser.email).then(() => {next()}).catch((err) => {next(err)});
};

/**
 * Check if current user authenticated or not
 * @param {HttpContext} ctx
 * @param {Model} instance
 * @param {Callback} next
 */
exports.checkCurrentUserAuthorized = function (ctx, instance, next) {
    var ctx = ctx || LoopBackContext.getCurrentContext();
    if (!ctx) {
        return next(CommonErrors.InternalError());
    }
    var currentUser = ctx.get('currentUser');
    if (!currentUser) {
        return next(SecurityErrors.NotAuthorized());
    }
    next();
};

