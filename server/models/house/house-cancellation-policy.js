//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var Common = require('narengi-utils').Common;
var Persistency = require('narengi-utils').Persistency;
var app = serverRequire('server');
var underscore = require('underscore');

module.exports = function (HouseCancellationPolicy) {
    defineServices(HouseCancellationPolicy);
    defineRemoteMethods(HouseCancellationPolicy);
};

/**
 * Create or update `HouseCancellationPolicy`
 * @param {Model} HouseCancellationPolicy
 * @param {string} id
 * @param {object} data
 * @param {Callback} cb
 */
function createOrUpdate(HouseCancellationPolicy, id, data, cb) {
    data.explanation = Persistency.Models.HouseCancellationPolicy.Explanation.Create(data.explanation);

    if (id === null) {
        HouseCancellationPolicy.create(data).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
    }
    else {
        HouseCancellationPolicy.findOne({
            where: {id: id}
        }).then((entity) => {
            if (!entity) return cb(Persistency.Error.NotFound());
            entity.updateAttributes(data).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
    }
}

function defineServices(HouseCancellationPolicy) {

    /**
     * Create `HouseCancellationPolicy` instance in storage.
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseCancellationPolicy.Create = function (data, cb) {
        cb = cb || Common.PromiseCallback();
        createOrUpdate(HouseCancellationPolicy, null, data, cb);
        return cb.promise;
    };

    /**
     * Update `HouseCancellationPolicy` instance
     * @param {string} id
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseCancellationPolicy.Update = function (id, data, cb) {
        cb = cb || Common.PromiseCallback();
        createOrUpdate(HouseCancellationPolicy, id, data, cb);
        return cb.promise;
    };

    /**
     * Returns all house cancellation policy.
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseCancellationPolicy.GetAll = function (cb) {
        cb = cb || Common.PromiseCallback();
        HouseCancellationPolicy.find({
            where: {lang: app.currentLocale}
        }).then((entities) => {
            if (!entities) return cb(Persistency.Errors.NotFound());
            entities = underscore.sortBy(entities, 'order');
            cb(null, entities);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    /**
     * Returns policy by id
     * @param {string} id
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseCancellationPolicy.GetById = function (id, cb) {
        cb = cb || Common.PromiseCallback();
        HouseCancellationPolicy.findById(id).then((entity) => {
            if (!entity) return cb(Persistency.Errors.NotFound());
            cb(null, entity);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    /**
     * Deletes policy instance by its id.
     * @param {string} id
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseCancellationPolicy.DeleteById = function (id, cb) {
        cb = cb || Common.PromiseCallback();
        HouseCancellationPolicy.destroyById(id).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };
}

function defineRemoteMethods(HouseCancellationPolicy) {

    HouseCancellationPolicy.remoteMethod(
        'Create', {
            description: 'Creates a cancellation policy',
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
            returns: {
                arg: 'houseCancellationPolicy',
                type: 'object',
                root: true
            },
            http: {
                path: "/",
                verb: 'post',
                status: 201
            }
        }
    );

    HouseCancellationPolicy.beforeRemote('Create', Common.RemoteHooks.argShouldNotEmpty("data"));
    HouseCancellationPolicy.beforeRemote('Create', Common.RemoteHooks.correctCaseOfKeysInArg("data", "HouseCancellationPolicy"));
    HouseCancellationPolicy.beforeRemote('Create', Common.RemoteHooks.dataOwnerCorrectorInArg("data", "HouseCancellationPolicy"));
    HouseCancellationPolicy.beforeRemote('Create', Common.RemoteHooks.injectLangToRequestData);

    HouseCancellationPolicy.afterRemote("Create", Common.RemoteHooks.convert2Dto(HouseCancellationPolicy, {skipId: true}));

    //========================================================================================

    HouseCancellationPolicy.remoteMethod(
        'Update', {
            description: 'Updates a cancellation policy',
            accepts: [
                {
                    arg: 'id',
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
                path: "/:id",
                verb: 'put',
                status: 204
            }
        }
    );

    HouseCancellationPolicy.beforeRemote('Update', Common.RemoteHooks.argShouldNotEmpty("data"));
    HouseCancellationPolicy.beforeRemote('Update', Common.RemoteHooks.correctCaseOfKeysInArg("data", "HouseCancellationPolicy"));
    HouseCancellationPolicy.beforeRemote('Update', Common.RemoteHooks.dataOwnerCorrectorInArg("data", "HouseCancellationPolicy"));
    HouseCancellationPolicy.beforeRemote('Update', Common.RemoteHooks.injectLangToRequestData);

    //========================================================================================

    HouseCancellationPolicy.remoteMethod(
        'GetAll', {
            description: 'Returns all cancellation policy',
            returns: {
                arg: 'policies',
                type: 'array',
                root: true
            },
            http: {
                path: "/",
                verb: 'get',
                status: 200
            }
        }
    );

    HouseCancellationPolicy.afterRemote("GetAll", Common.RemoteHooks.convert2Dto(HouseCancellationPolicy, {skipId: false}));

    //========================================================================================

    HouseCancellationPolicy.remoteMethod(
        'GetById', {
            description: 'Returns a cancellation policy by id',
            accepts: [
                {
                    arg: 'id',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                }
            ],
            returns: {
                arg: 'policy',
                type: 'HouseCancellationPolicyDTO',
                root: true
            },
            http: {
                path: "/:id",
                verb: 'get',
                status: 200
            }
        }
    );

    HouseCancellationPolicy.afterRemote("GetById", Common.RemoteHooks.convert2Dto(HouseCancellationPolicy, {skipId: false}));

    //========================================================================================

    HouseCancellationPolicy.remoteMethod(
        'DeleteById', {
            description: 'Deletes a cancellation policy by id',
            accepts: [
                {
                    arg: 'id',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                }
            ],
            http: {
                path: "/:id",
                verb: 'delete',
                status: 204
            }
        }
    );
}