//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');
var ctx = require('loopback/lib/access-context');
var AccessContext = ctx.AccessContext;
var Principal = ctx.Principal;
var AccessRequest = ctx.AccessRequest;
var Common = require('narengi-utils').Common;

module.exports = function (app) {

    /**
     Here we change default behaviour of checking access levels in `Application`.
     **/

    app["currentLocale"] = app.settings.locale.default;

    Principal.USER = "Account";
    var AuthToken = app.models.AuthToken;

    app.enableCustomAuth = function (options) {
        //var AUTH_MODELS = ['User', 'AccessToken', 'ACL', 'Role', 'RoleMapping'];
        var AUTH_MODELS = ['Account', 'ACL', 'Role', 'RoleMapping'];

        var remotes = this.remotes();
        var app = this;

        if (options && options.dataSource) {
            var appModels = app.registry.modelBuilder.models;
            AUTH_MODELS.forEach(function (m) {
                var Model = app.registry.findModel(m);
                if (!Model) {
                    throw new Error(
                        'Authentication requires model ' + m + ' to be defined.');
                }

                if (m.dataSource || m.app) return;

                for (var name in appModels) {
                    var candidate = appModels[name];
                    var isSubclass = candidate.prototype instanceof Model;
                    var isAttached = !!candidate.dataSource || !!candidate.app;
                    if (isSubclass && isAttached) return;
                }

                app.model(Model, {
                    dataSource: options.dataSource,
                    public: m === 'User'
                });
            });
        }

        remotes.authorization = function (ctx, next) {
            var method = ctx.method;
            var req = ctx.req;
            var Model = method.ctor;
            var modelInstance = ctx.instance;

            var modelId = modelInstance && modelInstance.id ||
                // replacement for deprecated req.param()
                (req.params && req.params.id !== undefined ? req.params.id :
                    req.body && req.body.id !== undefined ? req.body.id :
                        req.query && req.query.id !== undefined ? req.query.id :
                            undefined);

            var modelName = Model.modelName;

            var modelSettings = Model.settings || {};
            var errStatusCode = modelSettings.aclErrorStatus || app.get('aclErrorStatus') || 401;
            if (!req.accessToken) {
                errStatusCode = 401;
            }

            // comes from `Model` code of `loopback`
            if (Model.checkAccess) {
                doCheckAccess(
                    Model,
                    req.accessToken,
                    modelId,
                    method,
                    ctx,
                    function (err, allowed) {
                        if (err) {
                            console.log(err);
                            next(err);
                        } else if (allowed) {
                            next();
                        } else {

                            var messages = {
                                403: {
                                    message: 'Access Denied',
                                    code: 'ACCESS_DENIED'
                                },
                                404: {
                                    message: ('could not find ' + modelName + ' with id ' + modelId),
                                    code: 'MODEL_NOT_FOUND'
                                },
                                401: {
                                    message: 'Authorization Required',
                                    code: 'AUTHORIZATION_REQUIRED'
                                }
                            };

                            var e = Common.Errors.makeError({
                                statusCode: errStatusCode,
                                code: messages[errStatusCode].code || messages[403].code,
                                message: messages[errStatusCode].message || messages[403].message
                            });

                            next(e);
                        }
                    }
                );
            } else {
                next();
            }
        };

        this.isAuthEnabled = true;
    };

    var doCheckAccess = function (Model, token, modelId, sharedMethod, ctx, cb) {

        var ANONYMOUS = AuthToken.ANONYMOUS;
        token = token || ANONYMOUS;
        var aclModel = Model._ACL();

        ctx = ctx || {};
        if (typeof ctx === 'function' && cb === undefined) {
            cb = ctx;
            ctx = {};
        }

        var checkingContext = {
            accessToken: token,
            model: Model,
            id: modelId,
            property: sharedMethod.name,
            accessType: Model._getAccessTypeForMethod(sharedMethod)
        };

        var accessCtx = new AccessContext(checkingContext);

        aclModel.checkAccessForContext(checkingContext, function (err, accessRequest) {
            if (err) return cb(err);
            cb(null, accessRequest.isAllowed());
        });
    };


};