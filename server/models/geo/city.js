//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');
var underscore = require('underscore');
var string = require('string');
var commonBeforeRemotes = require('narengi-utils').Common.RemoteHooks;
var app = serverRequire('server');
var promiseCallback = require('narengi-utils').Common.PromiseCallback;
var crudHandler = require('narengi-utils').Persistency.CrudHandlers;
var Persistency = require('narengi-utils').Persistency;
var Errors = require('narengi-utils').Common.Errors;
var Pagination = require('narengi-utils').Pagination;
var Common = require('narengi-utils').Common;

module.exports = function (City) {
    defineServices(City);
    definePictureStuff(City);
};

/**
 * Before remote function to correct data sent from client
 * @param {HttpContext} ctx
 * @param {City} instance If update method called then this parameter is valid
 * @param {Callback} next
 */
function dataCorrector(ctx, instance, next) {
    var data = ctx.req.body;
    if (!data) {
        next(Errors.DataEmpty());
    }

    var defaultForm = {
        "name": "",
        "summary": "",
        "description": ""
    };
    data = underscore.pick(data, underscore.keys(defaultForm));
    ctx.req.body = data;
    next();
}

/**
 * Main function for creating or updating `City` model
 * @param {string|null} cityId
 * @param {object} data
 * @param {Callback} cb
 * @returns {Promise}
 */
function createOrUpdateCity(cityId, data, cb) {
    if (cityId === null) {
        app.models.City.create(data).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
    } else {
        app.models.City.findOne({
            where: {id: cityId}
        }).then((city) => {
            if (!city) return cb(Persistency.Errors.NotFound());
            city.updateAttributes(data).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
        }).catch(crudHandler.failureHandler(cb));
    }
    return cb.promise;
}

function defineServices(City) {

    /**
     * Creates a new `City`
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.Create = function (data, cb) {
        cb = cb || promiseCallback();
        return createOrUpdateCity(null, data, cb);
    };

    City.beforeRemote('Create', commonBeforeRemotes.correctCaseOfKeys);
    City.beforeRemote('Create', dataCorrector);
    City.beforeRemote('Create', commonBeforeRemotes.correctRequestData);
    City.beforeRemote('Create', commonBeforeRemotes.injectLangToRequestData);
    City.afterRemote("Create", Common.RemoteHooks.convert2Dto(City));

    City.remoteMethod(
        'Create', {
            description: 'Creates a city.',
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
                arg: 'city',
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
     * Updates a `City`
     * @param {string} cityId
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.Update = function (cityId, data, cb) {
        cb = cb || promiseCallback();
        return createOrUpdateCity(cityId, data, cb);
    };

    City.beforeRemote('Update', commonBeforeRemotes.correctCaseOfKeys);
    City.beforeRemote('Update', dataCorrector);
    City.beforeRemote('Update', commonBeforeRemotes.correctRequestData);
    City.beforeRemote('Update', commonBeforeRemotes.injectLangToRequestData);
    City.afterRemote("Update", Common.RemoteHooks.convert2Dto(City));

    City.remoteMethod(
        'Update', {
            description: 'Updates a city.',
            accepts: [
                {
                    arg: 'cityId',
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
                arg: 'city',
                type: 'object',
                root: true
            },
            http: {
                path: "/:cityId",
                verb: 'put',
                status: 201
            }
        }
    );

    //========================================================================================

    /**
     * Deletes a `City` by its id
     * @param {string} cityId
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.DeleteOne = function (cityId, cb) {
        cb = cb || promiseCallback();

        City.findOne({where: {id: cityId}}).then(function (city) {
            city.destroy().then(crudHandler.successHandler(cb)).catch(Errors.InternalError());
        }).catch(() => {
            cb(Persistency.Errors.NotFound());
        });

        return cb.promise;
    };

    City.remoteMethod(
        'DeleteOne', {
            description: 'Deletes a city.',
            accepts: [
                {
                    arg: 'cityId',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                }
            ],
            http: {
                path: "/:cityId",
                verb: 'delete',
                status: 204
            }
        }
    );

    //========================================================================================

    /**
     * Fetch a `City` by its id
     * @param {string} cityId
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.GetById = function (cityId, cb) {
        cb = cb || promiseCallback();
        City.findById(cityId).then((city) => {
            if (city) {
                return cb(null, city);
            }
            cb(Persistency.Errors.NotFound());
        }).catch(crudHandler.failureHandler(cb));
        return cb.promise;
    };

    City.afterRemote("GetById", Common.RemoteHooks.convert2Dto(City));

    City.remoteMethod(
        'GetById', {
            description: 'Get a city by id',
            accepts: [
                {
                    arg: 'cityId',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                }
            ],
            returns: {
                arg: 'city',
                type: 'object',
                root: true,
            },
            http: {
                path: "/:cityId",
                verb: 'get',
                status: 200
            }
        }
    );

    //========================================================================================

    /**
     *
     * @param {string | null} term Search term
     * @param {object} paging Like {skip: 0, limit: 10}
     * @param {HttpRequest} req
     * @param {HttpResponse} res
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.Search = function (term, paging, req, res, cb) {
        cb = cb || promiseCallback();
        var filter = paging;

        //type of argument is string so we test it by empty string
        if (term !== "") {
            filter["where"] = {name: {like: term, options: "i"}}; // i denotes insensitivity
        }
        City.find(filter).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
        return cb.promise;
    };

    City.beforeRemote("Search", Pagination.RemoteHooks.argumentWrapper(['term']));

    /**
     * Refine pagination arg
     */
    City.beforeRemote("Search", Pagination.RemoteHooks.refinePaginationParams);

    City.afterRemote("Search", Pagination.RemoteHooks.afterPaginatedService);
    City.afterRemote("Search", Common.RemoteHooks.convert2Dto(City));

    City.remoteMethod(
        'Search', {
            description: 'Search in cities',
            accepts: [
                {
                    arg: 'term',
                    type: 'string',
                    required: true,
                    http: function (ctx) {
                        var req = ctx.req;
                        return (req.query && req.query.term) ? req.query.term : "";
                    }
                },
                {
                    arg: 'paging',
                    type: 'object',
                    required: true,
                    http: Pagination.Common.HttpPagingParam
                }
            ],
            returns: {
                arg: 'city',
                type: '[object]',
                root: true
            },
            http: {
                path: "/search",
                verb: 'get',
                status: 200
            }
        }
    );

    //========================================================================================

    City.GetAll = function (paging, cb) {
        cb = cb || PromiseCallback();
        var filter = paging;
        this.injectLangToFilter(filter);
        City.find(filter).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
        return cb.promise;
    };

    /**
     * Refine pagination arg
     */
    City.beforeRemote("GetAll", Pagination.RemoteHooks.refinePaginationParams);

    City.afterRemote("GetAll", Pagination.RemoteHooks.afterPaginatedService);
    City.afterRemote("GetAll", Common.RemoteHooks.convert2Dto(City));

    City.remoteMethod(
        'GetAll', {
            description: 'Returns all `City` instances based on input filtering',
            accepts: [
                {
                    arg: 'paging',
                    type: 'object',
                    required: true,
                    http: Pagination.Common.HttpPagingParam,
                    description: ['Calculated parameter.',
                        'In REST call should be like : `/cities?limit=25&skip=150`']
                }
            ],
            returns: {
                arg: 'cities',
                type: 'array',
                root: true,
                description: 'List of paginated `City` instances'
            },
            http: {
                path: "/",
                verb: 'get',
                status: 200
            }
        }
    );
}

function definePictureStuff(City) {
    /**
     * Module method for uploading one picture
     * @param {string} cityId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.UploadPicture = function (cityId, ctx, cb) {
        cb = cb || promiseCallback();

        City.findById(cityId).then(cityFoundHandler).catch(cityNotFoundHandler);

        return cb.promise;

        function cityFoundHandler(city) {

            var options = {};
            app.models.CityImageContainer.UploadPicture(city, ctx, options).then(uploadCompletedHandler).catch(uploadFailedHandler);

            function uploadCompletedHandler(result) {
                var pictures = result.db; //synced
                city.updateAttributes({pictures: pictures}).then(function (updatedCity) {
                    var api = {};
                    api.url = `/cities/${updatedCity.id}/pictures/${result.api[0].hash}`;
                    api.styles = underscore.reduce(result.api[0].styles, function (memo, stylePack) {
                        return underscore.extend(memo, stylePack.style);
                    }, {});
                    cb(null, api);
                }).catch(uploadFailedHandler);
            }

            function uploadFailedHandler(err) {
                cb(err);
            }
        }

        function cityNotFoundHandler(err) {
            cb(Persistency.Errors.NotFound());
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    City.remoteMethod("UploadPicture", {
        accepts: [
            {arg: 'cityId', type: 'string', http: {source: 'path'}},
            {arg: 'ctx', type: 'object', http: {source: 'context'}}
        ],
        returns: {
            arg: 'fileObject', type: 'object', root: true
        },
        http: {verb: 'post', status: 201, path: "/:cityId/picture"}
    });

    /**
     * Module method for uploading multiple pictures
     * @param {string} cityId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.UploadPictureAll = function (cityId, ctx, cb) {
        cb = cb || promiseCallback();

        City.findById(cityId).then(cityFoundHandler).catch(cityNotFoundHandler);

        return cb.promise;

        function cityFoundHandler(city) {

            var options = {};
            app.models.CityImageContainer.UploadPictureAll(city, ctx, options).then(uploadCompletedHandler).catch(uploadFailedHandler);

            function uploadCompletedHandler(result) {
                var pictures = result.db; //synced
                city.updateAttributes({pictures: pictures}).then(function (updatedCity) {
                    var apiArr = [];
                    underscore.each(result.api, function (filePack) {
                        var api = {};
                        api.url = `/cities/${updatedCity.id}/pictures/${filePack.hash}`;
                        api.styles = underscore.reduce(filePack.styles, function (memo, stylePack) {
                            return underscore.extend(memo, stylePack.style);
                        }, {});
                        apiArr.push(api);
                    });

                    cb(null, apiArr);
                }).catch(uploadFailedHandler);
            }

            function uploadFailedHandler(err) {
                cb(err);
            }
        }

        function cityNotFoundHandler(err) {
            cb(Persistency.Errors.NotFound());
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    City.remoteMethod("UploadPictureAll", {
        accepts: [
            {arg: 'cityId', type: 'string', http: {source: 'path'}},
            {arg: 'ctx', type: 'object', http: {source: 'context'}}
        ],
        returns: {
            arg: 'fileObject', type: 'array', root: true
        },
        http: {verb: 'post', status: 201, path: "/:cityId/pictures"}
    });

    /**
     * Module method for downloading city picture by its name
     * @param {string} id
     * @param {string} hash
     * @param style
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.DownloadPicture = function (id, hash, style, ctx, cb) {
        cb = cb || promiseCallback();

        City.findById(id).then(cityFoundHandler).catch(cityNotFoundHandler);

        return cb.promise;

        function cityFoundHandler(city) {

            try {
                app.models.CityImageContainer.DownloadPicture(city, hash, style, ctx);
            }
            catch (ex) {
                cb(ex);
            }
        }

        function cityNotFoundHandler(err) {
            cb(err);
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    City.remoteMethod("DownloadPicture", {
        accepts: [
            {arg: 'id', type: 'string', required: true, http: {source: 'path'}},
            {arg: 'hash', type: 'string', required: true, http: {source: 'path'}},
            {
                arg: 'style', type: 'string',
                http: function (ctx) {
                    var req = ctx.req;
                    var query = req.query || {};
                    var style = query['style'] ? query['style'] : null;
                    return style ? style.trim() : "";
                }
            },
            {arg: 'ctx', type: 'object', http: {source: 'context'}}
        ],
        returns: {
            arg: 'fileObject', type: 'object', root: true
        },
        http: {verb: 'get', path: "/:id/pictures/:hash"}
    });

    /**
     * Returns list of picture files
     * @param {string} cityId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    City.GetPictureList = function (cityId, ctx, cb) {
        cb = cb || promiseCallback();

        City.findById(cityId).then(cityFoundHandler).catch(cityNotFoundHandler);

        return cb.promise;

        function cityFoundHandler(city) {
            if (!city) {
                return cb(Persistency.Errors.NotFound());
            }

            try {
                var pictures = city.pictures;
                if (pictures) {
                    var ret = app.models.Image.MakeFromDbArray(pictures);
                    cb(null, ret);
                }
                else {
                    cb(Persistency.Errors.NotFound());
                }
            }
            catch (ex) {
                cb(ex);
            }
        }

        function cityNotFoundHandler(err) {
            cb(err);
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    City.remoteMethod("GetPictureList", {
        accepts: [
            {arg: 'cityId', type: 'string', http: {source: 'path'}},
            {arg: 'ctx', type: 'object', http: {source: 'context'}}
        ],
        returns: {
            arg: 'fileObject', type: 'array', root: true
        },
        http: {verb: 'get', path: "/:cityId/pictures"}
    });
}