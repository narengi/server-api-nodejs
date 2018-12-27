//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Context = require('../context');
var LoopbackContext = require('loopback-context');

module.exports = perRequestContextFactory;

/**
 * Create a context and assign to current http request
 * @param options
 * @property options.name Name of context which is be accessible through the http request
 * @returns {Function} Middleware
 * @memberOf http-context
 */
function perRequestContextFactory(options) {
    options = options || {};
    var name = options.name || "narengi_context";

    return function (req, res, next) {
        var context = LoopbackContext.getCurrentContext();
        if (!context) {
            return next();
        }

        var ctx = context.get(name);
        if (!ctx) {
            return next();
        }

        ctx = Context.CreateContext(name);
        LoopbackContext.getCurrentContext().set(name, ctx);
        req[name] = ctx;
        next();
    }
}