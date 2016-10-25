//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var app = serverRequire('server');
var underscore = require('underscore');
var Common = require('narengi-utils').Common;
var promiseCallback = require('narengi-utils').Common.PromiseCallback;
var Persistency = require('narengi-utils').Persistency;
var Security = require('narengi-utils').Security;

module.exports = function (FinancialProfile) {
    defineServices(FinancialProfile);
    addHooks(FinancialProfile);
    defineRemoteMethods(FinancialProfile);
    defineAdminServices(FinancialProfile);
    addAdminHooks(FinancialProfile);
    defineAdminRemoteMethods(FinancialProfile);
};

/**
 * Method for creating current user profile;
 */
function createProfile(userId, data, cb) {
    cb = cb || promiseCallback();

    var promise = app.models.Person.GetByAccountId(userId);
    promise.then(createProfileHandler(data, cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
    return cb.promise;
}

/**
 * Creates an `FinancialProfile` after finding `Person`
 * This function is for handling callbacks from calling CRUD methods of `loopback'
 */
function createProfileHandler(data, cb) {
    return function (person) {
        cb = cb || promiseCallback();
        if (!person) {
            cb(Persistency.Errors.NotFound());
            return;
        }
        if (person.financialProfile.value()) {
            return cb(Persistency.Errors.Existed());
        }
        person.financialProfile.create(data, function (err, profile) {
            if (err) {
                return cb(err);
            }
            cb(null, profile);
        });

        return cb.promise;
    }
}

/**
 * Method for updating current user profile;
 */
function updateProfile(userId, data, cb) {
    cb = cb || promiseCallback();

    var promise = app.models.Person.GetByAccountId(userId);
    promise.then(updateProfileHandler(data, cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
    return cb.promise;
}

/**
 * Creates or updates an `FinancialProfile` after finding `Person`
 * This function is for handling callbacks from calling CRUD methods of `loopback'
 */
function updateProfileHandler(data, cb) {
    return function (person) {
        cb = cb || promiseCallback();
        if (!person) {
            cb(Persistency.Errors.NotFound());
            return;
        }
        if (!person.financialProfile.value()) {
            return cb(Persistency.Errors.NotFound());
        }
        person.financialProfile.update(data, function (err, profile) {
            if (err) {
                return cb(err);
            }
            cb(null, profile);
        });

        return cb.promise;
    }
}

function addHooks(FinancialProfile) {

    var defaultForm = {
        currency: app.settings.currency.default
    };

    FinancialProfile.beforeRemote('CreateProfile', Security.RemoteHooks.checkCurrentUserAuthorized);
    FinancialProfile.beforeRemote('CreateProfile', Common.RemoteHooks.correctCaseOfKeys);
    FinancialProfile.beforeRemote('CreateProfile', Common.RemoteHooks.dataOwnerCorrector(defaultForm));
    FinancialProfile.beforeRemote('CreateProfile', Common.RemoteHooks.correctRequestData);

    FinancialProfile.beforeRemote('UpdateProfile', Security.RemoteHooks.checkCurrentUserAuthorized);
    FinancialProfile.beforeRemote('UpdateProfile', Common.RemoteHooks.correctCaseOfKeys);
    FinancialProfile.beforeRemote('UpdateProfile', Common.RemoteHooks.dataOwnerCorrector(defaultForm));
    FinancialProfile.beforeRemote('UpdateProfile', Common.RemoteHooks.correctRequestData);
}

function defineServices(FinancialProfile) {

    /**
     * Creates `FinancialProfile` for current `Person`
     * @param {object} data
     * @param {Callback} cb
     */
    FinancialProfile.CreateProfile = function (data, cb) {
        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx.get('currentUser');
        return createProfile(currentUser.id, data, cb);
    };

    /**
     * Updates `FinancialProfile` for current `Person`
     * @param {object} data
     * @param {Callback} cb
     */
    FinancialProfile.UpdateProfile = function (data, cb) {
        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx.get('currentUser');
        return updateProfile(currentUser.id, data, cb);
    };
}

function defineRemoteMethods(FinancialProfile) {
    FinancialProfile.remoteMethod(
        'CreateProfile', {
            description: 'Creates an financial profile.',
            accepts: [
                {
                    arg: 'data',
                    type: 'object',
                    required: true,
                    http: {
                        source: 'body'
                    }
                }
            ],
            http: {
                path: "/",
                verb: 'post',
                status: 201
            }
        }
    );

    FinancialProfile.remoteMethod(
        'UpdateProfile', {
            description: 'Updates an financial profile.',
            accepts: [
                {
                    arg: 'data',
                    type: 'object',
                    required: true,
                    http: {
                        source: 'body'
                    }
                }
            ],
            http: {
                path: "/",
                verb: 'put',
                status: 204
            }
        }
    );
}

/**
 * Adds create-update user profile by admin capability
 * @param FinancialProfile
 */
function defineAdminServices(FinancialProfile) {

    /**
     * Creates `FinancialProfile` for current `Person` by admin
     * @param {object} data
     * @param {Callback} cb
     */
    FinancialProfile.CreateProfileByAdmin = function (userId, data, cb) {
        return createProfile(userId, data, cb);
    };

    /**
     * Updates `FinancialProfile` for current `Person` by admin
     * @param {object} data
     * @param {Callback} cb
     */
    FinancialProfile.UpdateProfileByAdmin = function (userId, data, cb) {
        return updateProfile(userId, data, cb);
    };


}

function addAdminHooks(FinancialProfile) {
    var defaultForm = {
        currency: app.settings.currency.default
    };

    FinancialProfile.beforeRemote('CreateProfileByAdmin', Security.RemoteHooks.checkCurrentUserIsAdmin);
    FinancialProfile.beforeRemote('CreateProfileByAdmin', Common.RemoteHooks.correctCaseOfKeys);
    FinancialProfile.beforeRemote('CreateProfileByAdmin', Common.RemoteHooks.dataOwnerCorrector(defaultForm));
    FinancialProfile.beforeRemote('CreateProfileByAdmin', Common.RemoteHooks.correctRequestData);

    FinancialProfile.beforeRemote('UpdateProfileByAdmin', Security.RemoteHooks.checkCurrentUserIsAdmin);
    FinancialProfile.beforeRemote('UpdateProfileByAdmin', Common.RemoteHooks.correctCaseOfKeys);
    FinancialProfile.beforeRemote('UpdateProfileByAdmin', Common.RemoteHooks.dataOwnerCorrector(defaultForm));
    FinancialProfile.beforeRemote('UpdateProfileByAdmin', Common.RemoteHooks.correctRequestData);
}

function defineAdminRemoteMethods(FinancialProfile) {
    FinancialProfile.remoteMethod(
        'CreateProfileByAdmin', {
            description: 'Creates an financial profile by admin.',
            accepts: [
                {
                    arg: 'userId',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                },
                {
                    arg: 'data',
                    type: 'object',
                    required: true,
                    http: {
                        source: 'body'
                    }
                }
            ],
            http: {
                path: "/:userId",
                verb: 'post',
                status: 201
            }
        }
    );

    FinancialProfile.remoteMethod(
        'UpdateProfileByAdmin', {
            description: 'Updates an financial profile by admin.',
            accepts: [
                {
                    arg: 'userId',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                },
                {
                    arg: 'data',
                    type: 'object',
                    required: true,
                    http: {
                        source: 'body'
                    }
                }
            ],
            http: {
                path: "/:userId",
                verb: 'put',
                status: 204
            }
        }
    );
}