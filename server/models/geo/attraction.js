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

module.exports = function (Attraction) {
    defineServices(Attraction);
    definePictureStuff(Attraction);
};

/**
 * Before remote function to correct data sent from client
 * @param {HttpContext} ctx
 * @param {Attraction} instance If update method called then this parameter is valid
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
 * Main function for creating or updating `Attraction` model
 * @param {string|null} attractionId
 * @param {object} data
 * @param {Callback} cb
 * @returns {Promise}
 */
function createOrUpdateAttraction(attractionId, data, cb) {
    if (attractionId === null) {
        app.models.Attraction.create(data).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
    } else {
        app.models.Attraction.findOne({
            where: {id: attractionId}
        }).then((attraction) => {
            if (!attraction) return cb(Persistency.Errors.NotFound());
            attraction.updateAttributes(data).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
        }).catch(crudHandler.failureHandler(cb));
    }
    return cb.promise;
}


function defineServices(Attraction) {
    /**
     * Creates a new `Attraction`
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.Create = function (data, cb) {
        cb = cb || promiseCallback();
        return createOrUpdateAttraction(null, data, cb);
    };

    Attraction.beforeRemote('Create', commonBeforeRemotes.correctCaseOfKeys);
    Attraction.beforeRemote('Create', dataCorrector);
    Attraction.beforeRemote('Create', commonBeforeRemotes.correctRequestData);
    Attraction.beforeRemote('Create', commonBeforeRemotes.injectLangToRequestData);
    Attraction.afterRemote('Create', Common.RemoteHooks.convert2Dto(Attraction));
    Attraction.remoteMethod(
        'Create', {
            description: 'Creates a attraction.',
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
                arg: 'attraction',
                type: 'object',
                root: true,
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
     * Updates a `Attraction`
     * @param {string} attractionId
     * @param {object} data
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.Update = function (attractionId, data, cb) {
        cb = cb || promiseCallback();
        return createOrUpdateAttraction(attractionId, data, cb);
    };

    Attraction.beforeRemote('Update', commonBeforeRemotes.correctCaseOfKeys);
    Attraction.beforeRemote('Update', dataCorrector);
    Attraction.beforeRemote('Update', commonBeforeRemotes.correctRequestData);
    Attraction.beforeRemote('Update', commonBeforeRemotes.injectLangToRequestData);
    Attraction.afterRemote("Update", function (ctx, instance, next) {
        ctx.result = {};
        next();
    });

    Attraction.remoteMethod(
        'Update', {
            description: 'Updates a attraction.',
            accepts: [
                {
                    arg: 'attractionId',
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
                arg: 'attraction',
                type: 'object',
                root: true,
            },
            http: {
                path: "/:attractionId",
                verb: 'put',
                status: 204
            }
        }
    );

    //========================================================================================

    /**
     * Deletes a `Attraction` by its id
     * @param {string} attractionId
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.DeleteOne = function (attractionId, cb) {
        cb = cb || promiseCallback();

        Attraction.findOne({where: {id: attractionId}}).then(function (attraction) {
            attraction.destroy().then(crudHandler.successHandler(cb)).catch(Errors.InternalError());
        }).catch(() => {
            cb(Persistency.Errors.NotFound());
        });

        return cb.promise;
    };

    Attraction.remoteMethod(
        'DeleteOne', {
            description: 'Deletes a attraction.',
            accepts: [
                {
                    arg: 'attractionId',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                }
            ],
            http: {
                path: "/:attractionId",
                verb: 'delete',
                status: 204
            }
        }
    );

    //========================================================================================

    /**
     * Fetch a `Attraction` by its id
     * @param {string} attractionId
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.GetById = function (attractionId, cb) {
        cb = cb || promiseCallback();
        Attraction.findById(attractionId).then((attraction) => {
            if (attraction) {
                return cb(null, attraction);
            }
            cb(Persistency.Errors.NotFound());
        }).catch(crudHandler.failureHandler(cb));
        return cb.promise;
    };

    Attraction.afterRemote('GetById', Common.RemoteHooks.convert2Dto(Attraction));

    Attraction.remoteMethod(
        'GetById', {
            description: 'Get a attraction by id',
            accepts: [
                {
                    arg: 'attractionId',
                    type: 'string',
                    required: true,
                    http: {
                        source: 'path'
                    }
                }
            ],
            returns: {
                arg: 'attraction',
                type: 'object',
                root: true,
            },
            http: {
                path: "/:attractionId",
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
    Attraction.Search = function (term, paging, req, res, cb) {
        cb = cb || promiseCallback();
        var filter = paging;

        //type of argument is string so we test it by empty string
        if (term !== "") {
            filter["where"] = {name: {like: term, options: "i"}}; // i denotes insensitivity
        }
        Attraction.find(filter).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
        return cb.promise;
    };

    Attraction.beforeRemote("Search", Pagination.RemoteHooks.argumentWrapper(['term']));

    /**
     * Refine pagination arg
     */
    Attraction.beforeRemote("Search", Pagination.RemoteHooks.refinePaginationParams);

    Attraction.afterRemote("Search", Pagination.RemoteHooks.afterPaginatedService);
    Attraction.afterRemote('Search', Common.RemoteHooks.convert2Dto(Attraction));

    Attraction.remoteMethod(
        'Search', {
            description: 'Search in attractions',
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
                },
                {
                    arg: 'req',
                    type: 'object',
                    required: true,
                    http: {
                        source: 'req'
                    }
                },
                {
                    arg: 'res',
                    type: 'object',
                    required: true,
                    http: {
                        source: 'res'
                    }
                }
            ],
            returns: {
                arg: 'attraction',
                type: '[object]',
                root: true,
            },
            http: {
                path: "/search",
                verb: 'get',
                status: 200
            }
        }
    );

    //========================================================================================

    Attraction.GetAll = function (paging, cb) {
        cb = cb || PromiseCallback();
        var filter = paging;
        this.injectLangToFilter(filter);
        Attraction.find(filter).then(crudHandler.successHandler(cb)).catch(crudHandler.failureHandler(cb));
        return cb.promise;
    };

    /**
     * Refine pagination arg
     */
    Attraction.beforeRemote("GetAll", Pagination.RemoteHooks.refinePaginationParams);

    Attraction.afterRemote("GetAll", Pagination.RemoteHooks.afterPaginatedService);
    Attraction.afterRemote("GetAll", Common.RemoteHooks.convert2Dto(Attraction));

    Attraction.remoteMethod(
        'GetAll', {
            description: 'Returns all `Attraction` instances based on input filtering',
            accepts: [
                {
                    arg: 'paging',
                    type: 'object',
                    required: true,
                    http: Pagination.Common.HttpPagingParam,
                    description: ['Calculated parameter.',
                        'In REST call should be like : `/attractions?limit=25&skip=150`']
                }
            ],
            returns: {
                arg: 'attractions',
                type: 'array',
                root: true,
                description: 'List of paginated `Attraction` instances'
            },
            http: {
                path: "/",
                verb: 'get',
                status: 200
            }
        }
    );
}

function definePictureStuff(Attraction) {
    /**
     * Module method for uploading one picture
     * @param {string} attractionId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.UploadPicture = function (attractionId, ctx, cb) {
        cb = cb || promiseCallback();

        Attraction.findById(attractionId).then(attractionFoundHandler).catch(attractionNotFoundHandler);

        return cb.promise;

        function attractionFoundHandler(attraction) {

            var options = {};
            app.models.AttractionImageContainer.UploadPicture(attraction, ctx, options).then(uploadCompletedHandler).catch(uploadFailedHandler);

            function uploadCompletedHandler(result) {
                var pictures = result.db; //synced
                attraction.updateAttributes({pictures: pictures}).then(function (updatedAttraction) {
                    var api = {};
                    api.url = `/attractions/${updatedAttraction.id}/pictures/${result.api[0].hash}`;
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

        function attractionNotFoundHandler(err) {
            cb(Persistency.Errors.NotFound());
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    Attraction.remoteMethod("UploadPicture", {
        accepts: [
            {arg: 'attractionId', type: 'string', http: {source: 'path'}},
            {arg: 'ctx', type: 'object', http: {source: 'context'}}
        ],
        returns: {
            arg: 'fileObject', type: 'object', root: true
        },
        http: {verb: 'post', status: 201, path: "/:attractionId/picture"}
    });

    /**
     * Module method for uploading multiple pictures
     * @param {string} attractionId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.UploadPictureAll = function (attractionId, ctx, cb) {
        cb = cb || promiseCallback();

        Attraction.findById(attractionId).then(attractionFoundHandler).catch(attractionNotFoundHandler);

        return cb.promise;

        function attractionFoundHandler(attraction) {

            var options = {};
            app.models.AttractionImageContainer.UploadPictureAll(attraction, ctx, options).then(uploadCompletedHandler).catch(uploadFailedHandler);

            function uploadCompletedHandler(result) {
                var pictures = result.db; //synced
                attraction.updateAttributes({pictures: pictures}).then(function (updatedattraction) {
                    var apiArr = [];
                    underscore.each(result.api, function (filePack) {
                        var api = {};
                        api.url = `/attractions/${updatedattraction.id}/pictures/${filePack.hash}`;
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

        function attractionNotFoundHandler(err) {
            cb(Persistency.Errors.NotFound());
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    Attraction.remoteMethod("UploadPictureAll", {
        accepts: [
            {arg: 'attractionId', type: 'string', http: {source: 'path'}},
            {arg: 'ctx', type: 'object', http: {source: 'context'}}
        ],
        returns: {
            arg: 'fileObject', type: 'array', root: true
        },
        http: {verb: 'post', status: 201, path: "/:attractionId/pictures"}
    });

    /**
     * Module method for downloading attraction picture by its name
     * @param {string} id
     * @param {string} hash
     * @param style
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.DownloadPicture = function (id, hash, style, ctx, cb) {
        cb = cb || promiseCallback();

        Attraction.findById(id).then(attractionFoundHandler).catch(attractionNotFoundHandler);

        return cb.promise;

        function attractionFoundHandler(attraction) {

            try {
                app.models.AttractionImageContainer.DownloadPicture(attraction, hash, style, ctx);
            }
            catch (ex) {
                cb(ex);
            }
        }

        function attractionNotFoundHandler(err) {
            cb(err);
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    Attraction.remoteMethod("DownloadPicture", {
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
     * @param {string} attractionId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Promise}
     */
    Attraction.GetPictureList = function (attractionId, ctx, cb) {
        cb = cb || promiseCallback();

        Attraction.findById(attractionId).then(attractionFoundHandler).catch(attractionNotFoundHandler);

        return cb.promise;

        function attractionFoundHandler(attraction) {
            if (!attraction) {
                return cb(Persistency.Errors.NotFound());
            }

            try {
                var pictures = attraction.pictures;
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

        function attractionNotFoundHandler(err) {
            cb(err);
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    Attraction.remoteMethod("GetPictureList", {
        accepts: [
            {arg: 'attractionId', type: 'string', http: {source: 'path'}},
            {arg: 'ctx', type: 'object', http: {source: 'context'}}
        ],
        returns: {
            arg: 'fileObject', type: 'array', root: true
        },
        http: {verb: 'get', path: "/:attractionId/pictures"}
    });
}