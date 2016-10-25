//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var Context = require('narengi-http-context').Context;
var LoopBackContext = require('loopback-context');

/**
 * Create a context and assign to current http request
 * @param options
 * @property options.name Name of context which is be accessible through the http request
 * @returns {Function} Middleware
 */
module.exports = function (options) {
    options = options || {};
    var name = options.name || "narengi_context";

    return function (req, res, next) {
        var context = LoopBackContext.getCurrentContext();
        if (!context) {
            return next();
        }

        var ctx = context.get(name);
        if (ctx) {
            return next();
        }

        ctx = Context.CreateContext(name);
        LoopBackContext.getCurrentContext().set(name, ctx);
        req[name] = ctx;
        req.getNarengiContext = function () {
            return req[name];
        };
        next();
    }
};