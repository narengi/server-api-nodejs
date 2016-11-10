//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var app = serverRequire('server');

function authWithJWT(req, loopbackCtx, token, username, next) {
    var context = loopbackCtx.get('narengi_context');

    var searchObj = token ? {
        "account_authToken.token": token
    } : null;

    if (searchObj && username) {
        searchObj = {
            "and": [{
                "account_authToken.token": token
            }, {
                "or": [{
                    "username": username
                }, {
                    "email": username
                }]
            }]
        }
    }

    if (searchObj) {
        // handle context -- added by Aref
        app.use(loopback.token()); // this calls getCurrentContext
        app.use(loopback.context()); // the context is started here
        // end
        app.models.Account.find({
                include: "authToken",
                where: searchObj
            },
            function(err, accs) {
                try {
                    req.accessToken = null;
                    req.loopbackContext.active.http.req.accessToken = null;
                } catch (ex) {}

                if (err || !accs || accs.length < 1) {
                    context.setUser(null);
                    context.setToken(null);
                    return next();
                }
                if (accs[0].authToken && app.models.AuthToken.isExpired(accs[0].authToken.value())) {
                    accs[0].authToken.destroy();
                    context.setUser(null);
                    context.setToken(null);
                    return next();
                }
                context.setUser(accs[0]);
                context.setToken(accs[0].authToken.value());
                try {
                    /**
                     This is needed for ACL and just used there
                     **/
                    var obj = {
                        id: accs[0].authToken.value().token,
                        type: 'password',
                        userId: String(accs[0].id),
                        username: accs[0].usernameOrEmail()
                    };

                    // added by aref
                    var ctx = loopback.getCurrentContext();
                    if (ctx) {
                        ctx.set('currentUser', accs[0]);
                    }

                    req.accessToken = obj;
                    req.loopbackContext.active.http.req.accessToken = obj;
                } catch (e) {}
                next();
            });
    } else {
        context.setUser(null);
        context.setToken(null);
        next();
    }
}

module.exports = function(options) {

    /**
     * Authorizes current `request` and set current user to `context`
     **/
    return function handler(req, res, next) {
        console.log('authentication-middleware for %s [%s]', req.url, req.method);
        try {
            //TODO: should add OAuth authorization
            var authHeader = (req.headers.authorization && JSON.parse("{" + req.headers.authorization + "}")) || null;
            // added by aref: support access token for authorization
            if (!Boolean(authHeader)) {
                authHeader = req.headers['access-token'] ? {
                    token: req.headers['access-token'],
                    username: null
                } : {};
            }
            //This is `plain` login mechanism
            // `username` could be an email
            LoopBackContext.runInContext(function(ns, domain) {
                authWithJWT(req, ns, authHeader.token, authHeader.username, next);
            });

        } catch (e) {
            next();
        } finally {}
    }
}
