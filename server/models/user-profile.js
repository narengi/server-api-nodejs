//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var underscore = require('underscore');
var string = require('string');
var async = require('async');
var promiseCallback = require('narengi-utils').Common.PromiseCallback;
var crudHandler = require('narengi-utils').Persistency.CrudHandlers;
var Errors = require('narengi-utils').Common.Errors;
var commonBeforeRemotes = require('narengi-utils').Common.RemoteHooks;
var app = serverRequire('server');
var SecurityErrors = require('narengi-utils').Security.Errors;
var PersistencyErrors = require('narengi-utils').Persistency.Errors;
var Security = require('narengi-utils').Security;
var Common = require('narengi-utils').Common;
var Persistency = require('narengi-utils').Persistency;

module.exports = function(UserProfile) {
    /**
     * `UserProfile` model definition
     */

    defineProperties(UserProfile);
    addHooks(UserProfile);
    defineServices(UserProfile);
    defineAdminStuff(UserProfile);
    defineProfilePictureMethods(UserProfile);
};

/**
 * Method for creating or updating current user profile;
 */
function createProfile(userId, data, cb) {
    cb = cb || promiseCallback();

    var promise = app.models.Account.findOne({
        where: {
            id: userId
        }
    });
    promise.then(createProfileHandler(data, cb)).catch(crudHandler.failureHandler(cb));
    return cb.promise;
}

/**
 * Creates or updates an `USerProfile` after finding `Account`
 * This function is for handling callbacks from calling CRUD methods of `loopback'
 */
function createProfileHandler(data, cb) {
    return function(account) {
        cb = cb || promiseCallback();
        if (!account) {
            cb(PersistencyErrors.NotFound());
            return;
        }
        if (account.profile.value()) {
            return cb(PersistencyErrors.Errors.Existed());
        }
        account.profile.create(data, function(err, profile) {
            if (err) {
                return cb(err);
            }
            cb(null, profile);
        });

        return cb.promise;
    }
};

/**
 * Method for creating or updating current user profile;
 */
function updateProfile(userId, data, cb) {
    cb = cb || promiseCallback();

    var promise = app.models.Account.findOne({
        where: {
            id: userId
        }
    });
    promise.then(updateProfileHandler(data, cb)).catch(crudHandler.failureHandler(cb));
    return cb.promise;
};

/**
 * Creates or updates an `USerProfile` after finding `Account`
 * This function is for handling callbacks from calling CRUD methods of `loopback'
 */
function updateProfileHandler(data, cb) {
    return function(account) {
        cb = cb || promiseCallback();
        if (!account) {
            cb(PersistencyErrors.NotFound());
            return;
        }
        if (!account.profile.value()) {
            return createProfileHandler(data, cb)(account);
        }
        account.profile.update(data, function(err, profile) {
            if (err) {
                return cb(err);
            }
            cb(null, profile);
        });

        return cb.promise;
    }
}

function defineProperties(UserProfile) {
    Object.defineProperty(UserProfile.prototype, "DisplayName", {
        get: function() {
            return `${this.title || ''} ${this.firstName || ''} ${this.lastName || ''}`;
        },
        configurable: true,
        enumerable: false
    });
}

/**
 * Add remote and operation hooks to the model
 */
var addHooks = function(UserProfile) {

    UserProfile.beforeRemote('CreateProfile', Security.RemoteHooks.checkCurrentUserAuthorized);
    UserProfile.beforeRemote('CreateProfile', commonBeforeRemotes.correctCaseOfKeys);
    UserProfile.beforeRemote('CreateProfile', dataOwnerCorrector);
    UserProfile.beforeRemote('CreateProfile', Common.RemoteHooks.correctRequestData);

    UserProfile.beforeRemote('UpdateProfile', Security.RemoteHooks.checkCurrentUserAuthorized);
    UserProfile.beforeRemote('UpdateProfile', commonBeforeRemotes.correctCaseOfKeys);
    UserProfile.beforeRemote('UpdateProfile', dataOwnerCorrector);
    UserProfile.beforeRemote('UpdateProfile', Common.RemoteHooks.correctRequestData);
};

/**
 A `beforeRemote` hook validating input data for persisting in storage
 This method correct and sanitizes input data.
 **/
var dataOwnerCorrector = function(ctx, instance, next) {
    var data = ctx.req.body;
    if (!data) {
        next(Errors.DataEmpty());
    }

    var defaultForm = {
        "title": "",
        "firstName": "",
        "lastName": "",
        "birthDate": ""
    };
    data = underscore.pick(data, underscore.keys(defaultForm));
    if (string(data.birthDate).isEmpty())
        delete data.birthDate;
    ctx.req.body = data;
    next();
};

var defineServices = function(UserProfile) {

    /**
     * Class method for creating an `UserProfile`
     * Just a proxy for main function.
     */
    UserProfile.CreateProfile = function(data, cb) {
        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx && ctx.get('currentUser');
        return createProfile(currentUser.id, data, cb);
    };

    UserProfile.remoteMethod(
        'CreateProfile', {
            description: 'Creates an user profile.',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            http: {
                path: "/",
                verb: 'post',
                status: 201
            }
        }
    );

    /**
     * Class method for updating an `UserProfile`
     * Just a proxy for main function.
     */
    UserProfile.UpdateProfile = function(data, cb) {
        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx && ctx.get('currentUser');
        return updateProfile(currentUser.id, data, cb);
    };

    UserProfile.remoteMethod(
        'UpdateProfile', {
            description: 'Updates an user profile.',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            http: {
                path: "/",
                verb: 'put',
                status: 204
            }
        }
    );

    UserProfile.EnsureProfileExisted = function(user, cb) {
        cb = cb || promiseCallback();
        if (!user) return cb(Persistency.Errors.NotFound());
        if (user.profile.value()) return cb(null, user.profile);
        user.__create__profile(cb);
        return cb.promise;
    };
};

function defineProfilePictureMethods(UserProfile) {

    /**
     * Main upload method
     * @param {Account} currentUser
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @private
     */
    UserProfile._UploadPictureOLD = function(currentUser, ctx, cb) {
        cb = cb || promiseCallback();

        var options = {};

        if (currentUser) {
            async.waterfall([
                function(callback) {
                    UserProfile.EnsureProfileExisted(currentUser, callback);
                },
                function(existedProfile, callback) {
                    currentUser.reload(callback);
                }
            ], function(err, reloadedUser) {
                if (err) return cb(err);
                console.time("UserProfileImageContainer.UploadPicture");
                app.models.UserProfileImageContainer.UploadPicture(reloadedUser, ctx, options)
                    .then(function(result) {
                        console.timeEnd("UserProfileImageContainer.UploadPicture");
                        var picture = result.db; //synced
                        if (underscore.isArray(picture))
                            picture = picture[0];
                        reloadedUser.profile.update({ picture: picture }).then((profile) => {
                            var api = {};
                            api.url = `/user-profiles/${reloadedUser.id}/picture/${result.api[0].hash}`;
                            api.styles = underscore.reduce(result.api[0].styles, function(memo, stylePack) {
                                return underscore.extend(memo, stylePack.style);
                            }, {});
                            // cb(null, api);
                            cb(null);
                        }).catch(function(err) {
                            cb(err);
                        });
                    })
                    .catch(function(ex) {
                        return cb(ex);
                    });
            });
        } else {
            cb(SecurityErrors.NotAuthorized());
        }
        return cb.promise;
    };

    /**
     * UPLOAD USER PROFILE -- added by Aref
     */
     UserProfile._UploadPicture = function(currentUser, ctx, cb) {
        cb = cb || promiseCallback();
        var options = {
            uid: currentUser.id
        };

        app.models.ImageContainerBase.UploadPicture2(ctx, options, {})
            .then(function(file){
                currentUser.profile.update({ picture: file });
                // file.styles = [];
                cb(null, file);
            })
            .catch(function(err){
                cb(err);
            })

        return cb.promise;
    };

    /**
     * Module method for uploading profile picture
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    UserProfile.UploadPicture = function(data, cb) {
        cb = cb || promiseCallback();

        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx && ctx.get('currentUser');
        if (!currentUser) return cb(Security.Errors.NotAuthorized());

        UserProfile._UploadPicture(currentUser, data, cb);

        return cb.promise;
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    UserProfile.remoteMethod("UploadPicture", {
        description: "Upload Picture",
        accepts: [{
            arg: 'data',
            type: 'object',
            http: {
                source: 'context'
            }
        }],
        returns: {
            arg: 'fileObject',
            type: 'object',
            root: true
        },
        http: {
            verb: 'post',
            status: 201,
            path: "/picture"
        }
    });

    /**
     * Module method for downloading profile picture
     * @param {String} hash
     * @param {String} style
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    UserProfile.DownloadPicture = function(hash, style, ctx, cb) {
        cb = cb || promiseCallback();
        var currentUser = LoopBackContext.getCurrentContext().get('currentUser');
        if (!currentUser) {
            return cb(SecurityErrors.NotAuthorized());
        }

        try {
            app.models.UserProfileImageContainer.DownloadPicture(currentUser, hash, style, ctx);
        } catch (ex) {
            cb(ex);
        }

        return cb.promise;
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    UserProfile.remoteMethod("DownloadPicture", {
        accepts: [
            { arg: 'hash', type: 'string', required: true, http: { source: 'path' } }, {
                arg: 'style',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    var query = req.query || {};
                    var style = query['style'] ? query['style'] : null;
                    return style ? style.trim() : "";
                }
            },
            { arg: 'ctx', type: 'object', http: { source: 'context' } }
        ],
        returns: {
            arg: 'fileObject',
            type: 'object',
            root: true
        },
        http: { verb: 'get', path: "/picture/:hash" }
    });

    /**
     * Upload profile picture by another user called `admin`
     * @param {String} id user id
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @public
     */
    UserProfile.UploadPictureForOther = function(id, ctx, cb) {
        cb = cb || promiseCallback();
        app.models.Account.findById(id).then((account) => {
            UserProfile._UploadPicture(account, ctx, cb);
        }).catch((e) => {
            cb(e);
        });
        return cb.promsie;
    };

    UserProfile.remoteMethod("UploadPictureForOther", {
        description: "Upload Picture for Other",
        accepts: [{
            arg: 'id',
            type: 'string',
            http: {
                source: 'path'
            }
        }, {
            arg: 'ctx',
            type: 'object',
            http: {
                source: 'context'
            }
        }],
        returns: {
            arg: 'fileObject',
            type: 'object',
            root: true
        },
        http: {
            verb: 'post',
            status: 201,
            path: "/:id/picture"
        }
    });

    /**
     * Download profile picture of other user
     * @param {String} id Account(User) id
     * @param {String} hash
     * @param {String} style
     * @param {HttpContext} ctx
     * @param {Callback} cb
     */
    UserProfile.DownloadPictureForOther = function(id, hash, style, ctx, cb) {
        cb = cb || promiseCallback();

        app.models.Account.findById(id).then(accountFound).catch(accountError);

        return cb.promise;

        function accountFound(account) {
            app.models.UserProfileImageContainer.DownloadPicture(account, hash, style, ctx);
        }

        function accountError(err) {
            cb(err);
        }
    };


    UserProfile.remoteMethod("DownloadPictureForOther", {
        accepts: [{
            arg: 'id',
            type: 'string',
            required: true,
            http: {
                source: 'path'
            }
        }, {
            arg: 'hash',
            type: 'string',
            required: true,
            http: {
                source: 'path'
            }
        }, {
            arg: 'style',
            type: 'string',
            http: function(ctx) {
                var req = ctx.req;
                var query = req.query || {};
                var style = query['style'] ? query['style'] : null;
                return style ? style.trim() : "";
            }
        }, {
            arg: 'ctx',
            type: 'object',
            http: {
                source: 'context'
            }
        }],
        returns: {
            arg: 'fileObject',
            type: 'object',
            root: true
        },
        http: {
            verb: 'get',
            path: "/:id/picture/:hash"
        }
    });

}


/**
 * Adds create-update user profile by admin capability
 * @param UserProfile
 */
function defineAdminStuff(UserProfile) {
    /**
     * Class method for creating an `UserProfile` by admin
     * Just a proxy for main function.
     */
    UserProfile.CreateProfileByAdmin = function(id, data, cb) {
        return createProfile(id, data, cb);
    };

    UserProfile.beforeRemote('CreateProfileByAdmin', Security.RemoteHooks.checkCurrentUserIsAdmin);
    UserProfile.beforeRemote('CreateProfileByAdmin', commonBeforeRemotes.correctCaseOfKeys);
    UserProfile.beforeRemote('CreateProfileByAdmin', dataOwnerCorrector);
    UserProfile.beforeRemote('CreateProfileByAdmin', Common.RemoteHooks.correctRequestData);

    UserProfile.remoteMethod(
        'CreateProfileByAdmin', {
            description: 'Creates an user profile by admin.',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }, {
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            http: {
                path: "/:id",
                verb: 'post',
                status: 201
            }
        }
    );

    /**
     * Class method for updating an `UserProfile` by admin
     * Just a proxy for main function.
     */
    UserProfile.UpdateProfileByAdmin = function(id, data, cb) {
        return updateProfile(id, data, cb);
    };

    UserProfile.beforeRemote('UpdateProfileByAdmin', Security.RemoteHooks.checkCurrentUserIsAdmin);
    UserProfile.beforeRemote('UpdateProfileByAdmin', commonBeforeRemotes.correctCaseOfKeys);
    UserProfile.beforeRemote('UpdateProfileByAdmin', dataOwnerCorrector);
    UserProfile.beforeRemote('UpdateProfileByAdmin', Common.RemoteHooks.correctRequestData);

    UserProfile.remoteMethod(
        'UpdateProfileByAdmin', {
            description: 'Updates an user profile by admin.',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }, {
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            http: {
                path: "/:id",
                verb: 'put',
                status: 204
            }
        }
    );
}
