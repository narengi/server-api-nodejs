//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var Common = require('narengi-utils').Common;
var Pagination = require('narengi-utils').Pagination;
var Persistency = require('narengi-utils').Persistency;
var app = serverRequire('server');
var underscore = require('underscore');
var loopback = require('loopback');

module.exports = function (HouseType) {
    defineServices(HouseType);
};

/**
 * Create or update `HouseType` based on inputs.
 * I `houseId` is null so it creates a new or, otherwise updates existing one.
 * @param {string} typeId
 * @param {object} data
 * @param {Callback} cb
 */
function createOrUpdateHouseType(typeId, data, cb) {
    if (typeId === null) {
        delete data["id"];
    }
    else {
        data.id = typeId;
    }
    app.models.HouseType.upsert(data, cb);
    return cb.promise;
}

function defineServices(HouseType) {

    /**
     * Creates a `HouseType`.
     * House type specifies how the house should be accommodated to guests.
     * @param {object} data
     * @param {Callback} cb
     */
    HouseType.Create = function (data, cb) {
        cb = cb || Common.PromiseCallback();
        return createOrUpdateHouseType(null, data, cb);
    };

    HouseType.beforeRemote('Create', Common.RemoteHooks.argShouldNotEmpty('data'));
    HouseType.beforeRemote('Create', Common.RemoteHooks.correctCaseOfKeys);
    HouseType.beforeRemote('Create', Common.RemoteHooks.dataOwnerCorrectorInArg('data', 'HouseType'));
    HouseType.beforeRemote('Create', Common.RemoteHooks.injectLangToRequestData);
    HouseType.beforeRemote('Create', Persistency.Validation.RemoteHooks.Before.CheckUniqueness("HouseType", "data", ["lang", "key"]));
    HouseType.afterRemote("Create", Common.RemoteHooks.convert2Dto(HouseType));

    HouseType.remoteMethod(
        'Create', {
            description: 'Creates a house type.',
            accepts: [
                {arg: 'data', type: 'object', required: true, http: {source: 'body'}}
            ],
            returns: {arg: 'houseType', type: 'HouseTypeDTO', root: true},
            http: {path: "/", verb: 'post', status: 201}
        }
    );

    //========================================================================================

    /**
     * Updates a `HouseType`.
     * House type specifies how the house should be accommodated to guests.
     * @param {string} id house type id
     * @param {object} data
     * @param {Callback} cb
     */
    HouseType.Update = function (id, data, cb) {
        cb = cb || Common.PromiseCallback();
        return createOrUpdateHouseType(id, data, cb);
    };

    HouseType.beforeRemote('Update', Common.RemoteHooks.argShouldNotEmpty('data'));
    HouseType.beforeRemote('Update', Common.RemoteHooks.correctCaseOfKeys);
    HouseType.beforeRemote('Update', Common.RemoteHooks.dataOwnerCorrectorInArg('data', 'HouseType'));
    HouseType.beforeRemote('Update', Common.RemoteHooks.injectLangToRequestData);
    HouseType.beforeRemote('Update', Persistency.Validation.RemoteHooks.Before.CheckUniqueness("HouseType", "data", ["lang", "key"]));
    HouseType.afterRemote("Update", Common.RemoteHooks.convert2Dto(HouseType));

    HouseType.remoteMethod(
        'Update', {
            description: 'Updates a house type.',
            accepts: [
                {arg: 'id', type: 'string', required: true, http: {source: 'path'}},
                {arg: 'data', type: 'object', required: true, http: {source: 'body'}}
            ],
            returns: {arg: 'houseType', type: 'HouseTypeDTO', root: true},
            http: {path: "/:id", verb: 'put', status: 204}
        }
    );

    //========================================================================================

    /**
     * Retrieves `HouseType` by its id
     * @param {string} id
     * @param {Callback} cb
     */
    HouseType.GetById = function (id, cb) {
        cb = cb || Common.PromiseCallback();
        HouseType.findById(id).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    HouseType.afterRemote("GetById", Common.RemoteHooks.convert2Dto(HouseType));

    HouseType.remoteMethod(
        'GetById', {
            description: 'Retrieves a house type.',
            accepts: [
                {arg: 'id', type: 'string', required: true, http: {source: 'path'}}
            ],
            returns: {arg: 'houseType', type: 'HouseTypeDTO', root: true},
            http: {path: "/:id", verb: 'get', status: 200}
        }
    );

    //========================================================================================

    /**
     * Retrieves all `HouseType`s
     * @param {Pagination} paging
     * @param {Callback} cb
     */
    HouseType.GetAll = function (paging, cb) {
        cb = cb || Common.PromiseCallback();
        HouseType.find(paging).then(Persistency.CrudHandlers.arraySuccessHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    /**
     * Refine pagination arg
     */
    HouseType.beforeRemote("GetAll", Pagination.RemoteHooks.refinePaginationParams);
    HouseType.afterRemote("GetAll", Pagination.RemoteHooks.afterPaginatedService);

    HouseType.remoteMethod(
        'GetAll', {
            description: 'Retrieves al house types.',
            accepts: [
                {
                    arg: 'paging',
                    type: 'object',
                    required: true,
                    http: Pagination.Common.HttpPagingParam
                }
            ],
            returns: {arg: 'houseType', type: 'array', root: true},
            http: {path: "/", verb: 'get', status: 200}
        }
    );

    //========================================================================================

    /**
     * Deletes a `HouseType` by its id.
     * @param {string} id
     * @param {Callback} cb
     */
    HouseType.DeleteById = function (id, cb) {
        cb = cb || Common.PromiseCallback();
        HouseType.destroyById(id, (err) => {
            if (err) return cb(err);
            cb(null);
        });
        return cb.promsie;
    };

    HouseType.remoteMethod(
        'DeleteById', {
            description: 'Deletes a house type.',
            accepts: [
                {arg: 'id', type: 'string', required: true, http: {source: 'path'}}
            ],
            http: {path: "/:id", verb: 'delete', status: 204}
        }
    );

}