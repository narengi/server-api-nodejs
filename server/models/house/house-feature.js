//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Common = require('narengi-utils').Common;
var Pagination = require('narengi-utils').Pagination;
var Persistency = require('narengi-utils').Persistency;
var app = serverRequire('server');
var underscore = require('underscore');
var loopback = require('loopback');

module.exports = function (HouseFeature) {
    defineServices(HouseFeature);
};

/**
 * Before remote function to correct data sent from client
 * @param {HttpContext} ctx
 * @param {House} instance If update method called then this parameter is valid
 * @param {Callback} next
 */
function dataCorrector(ctx, instance, next) {
    var data = ctx.req.body;
    if (!data) {
        next(Common.Errors.DataEmpty());
    }

    var defaultForm = {
        "key": "",
        "title": "",
        "description": "",
        "group": ""
    };
    data = underscore.pick(data, underscore.keys(defaultForm));
    data['key'] = data['key'].trim().toLowerCase().replace(/\ /g, '-');
    if (data['title']) data['title'] = data['title'].trim();
    if (data['group']) data['group'] = data['group'].trim();
    if (data['description']) data['description'] = data['description'].trim();
    ctx.req.body = data;
    next();
}


/**
 * Main function for creating or updating `HouseFeature` model
 * @param {string|null} houseFeatureId
 * @param {object} data
 * @param {Callback} cb
 * @returns {Promise}
 */
function createOrUpdateHouseFeature(houseFeatureId, data, cb) {
    if (houseFeatureId === null) {
        app.models.HouseFeature.create(data).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
    } else {
        app.models.HouseFeature.findOne({
            where: {id: houseFeatureId}
        }).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            house.updateAttributes(data).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
    }
    return cb.promise;
}


/**
 * Add services to `HouseFeature`
 * @param {Model} HouseFeature
 */
function defineServices(HouseFeature) {

    /**
     * Creates a new `HouseFeature`
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseFeature.Create = function (data, cb) {
        cb = cb || Common.PromiseCallback();
        return createOrUpdateHouseFeature(null, data, cb);
    };

    HouseFeature.beforeRemote('Create', Common.RemoteHooks.correctCaseOfKeys);
    HouseFeature.beforeRemote('Create', dataCorrector);
    HouseFeature.beforeRemote('Create', Common.RemoteHooks.correctRequestData);
    HouseFeature.beforeRemote('Create', Common.RemoteHooks.injectLangToRequestData);
    HouseFeature.beforeRemote('Create', Persistency.Validation.RemoteHooks.Before.CheckUniqueness(HouseFeature.definition.name, "data", ["lang", "key"]));
    HouseFeature.afterRemote("Create", Common.RemoteHooks.convert2Dto(HouseFeature));

    HouseFeature.remoteMethod(
        'Create', {
            description: 'Creates a house feature.',
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
                arg: 'houseFeature',
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

    //========================================================================================

    /**
     * Updates a `HouseFeature`
     * @param {string} id
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseFeature.Update = function (id, data, cb) {
        cb = cb || Common.PromiseCallback();
        return createOrUpdateHouseFeature(id, data, cb);
    };

    HouseFeature.beforeRemote('Update', Common.RemoteHooks.correctCaseOfKeys);
    HouseFeature.beforeRemote('Update', dataCorrector);
    HouseFeature.beforeRemote('Update', Common.RemoteHooks.correctRequestData);
    HouseFeature.beforeRemote('Update', Common.RemoteHooks.injectLangToRequestData);
    HouseFeature.afterRemote("Update", Common.RemoteHooks.convert2Dto(HouseFeature));

    HouseFeature.remoteMethod(
        'Update', {
            description: 'Updates a house feature.',
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
            returns: {
                arg: 'houseFeature',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id",
                verb: 'put',
                status: 204
            }
        }
    );

    //========================================================================================

    /**
     * Deletes a `HouseFeature` by its id
     * @param {string} id
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseFeature.DeleteOne = function (id, cb) {
        cb = cb || Common.PromiseCallback();

        HouseFeature.findOne({where: {id: id}}).then(function (house) {
            house.destroy().then(Persistency.CrudHandlers.successHandler(cb)).catch(Common.Errors.InternalError());
        }).catch(() => {
            cb(Persistency.Errors.NotFound());
        });

        return cb.promise;
    };

    HouseFeature.remoteMethod(
        'DeleteOne', {
            description: 'Deletes a house feature.',
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

    //========================================================================================

    /**
     * Fetch a `HouseFeature` by its id
     * @param {string} id
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseFeature.GetById = function (id, cb) {
        cb = cb || Common.PromiseCallback();
        HouseFeature.findById(id).then((house) => {
            if (house) {
                return cb(null, house);
            }
            cb(Persistency.Errors.NotFound());
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    HouseFeature.afterRemote("GetById", Common.RemoteHooks.convert2Dto(HouseFeature));

    HouseFeature.remoteMethod(
        'GetById', {
            description: 'Get a house feature by id',
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
                arg: 'houseFeature',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id",
                verb: 'get',
                status: 200
            }
        }
    );

    //========================================================================================

    HouseFeature.GetByKey = function (key, lang, cb) {
        cb = cb || Common.PromiseCallback();
        HouseFeature.findOne({
            where: {
                lang: lang,
                key: key
            }
        }).then((feature) => {
            cb(null, feature);
        }).catch((err) => {
            cb(err);
        });
        return cb.promise;
    };

    //========================================================================================

    HouseFeature.GetAll = function (paging, cb) {
        cb = cb || PromiseCallback();
        // var filter = paging;
        // this.injectLangToFilter(filter);
        HouseFeature.find({})
            .then(Persistency.CrudHandlers.successHandler(cb))
            .catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    /**
     * Refine pagination arg
     */
    HouseFeature.beforeRemote("GetAll", Pagination.RemoteHooks.refinePaginationParams);

    HouseFeature.afterRemote("GetAll", Pagination.RemoteHooks.afterPaginatedService);
    HouseFeature.afterRemote("GetAll", Common.RemoteHooks.convert2Dto(HouseFeature));

    HouseFeature.remoteMethod(
        'GetAll', {
            description: 'Returns all `HouseFeature` instances based on input filtering',
            accepts: [
                {
                    arg: 'paging',
                    type: 'object',
                    required: true,
                    http: Pagination.Common.HttpPagingParam,
                    description: ['Calculated parameter.',
                        'In REST call should be like : `/house-features?limit=25&skip=150`']
                }
            ],
            returns: {
                arg: 'features',
                type: 'array',
                root: true,
                description: 'List of paginated `HouseFeature` instances'
            },
            http: {
                path: "/",
                verb: 'get',
                status: 200
            }
        }
    );
}