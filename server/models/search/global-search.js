//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var app = serverRequire('server');
var loopback = require('loopback');
var promiseCallback = require('narengi-utils').Common.PromiseCallback;
var async = require('async');
var underscore = require('underscore');
var Pagination = require('narengi-utils').Pagination;

/**
 * This is main module for searching in the system
 * @param {Model} GlobalSearch
 */
module.exports = function(GlobalSearch) {
    defineMethods(GlobalSearch);
    defineGeneralServices(GlobalSearch);
    defineHooks(GlobalSearch);
    defineRemoteMethods(GlobalSearch);
};

/**
 * Defines static methods
 * @param GlobalSearch
 */
function defineMethods(GlobalSearch) {
    GlobalSearch.count = function(where) {

        function countModel(Model, where, asyncCallback) {
            Model.count(where).then((result) => {
                asyncCallback(null, result);
            }).catch((err) => {
                asyncCallback(err);
            });
        }

        return new Promise(function(resolve, reject) {
            async.parallel([
                function(houseCb) {
                    //do nothing currently
                    houseCb(null, 0);
                },
                function(attractionCb) {
                    countModel(app.models.Attraction, where, attractionCb);
                },
                function(cityCb) {
                    countModel(app.models.City, where, cityCb);
                }
            ], function(err, result) {
                if (err) return reject(err);

                var sum = underscore.reduce(result, function(memo, num) {
                    return memo + num;
                }, 0);
                resolve(sum);
            });
        });
    };
}

/**
 * Add general services
 * @param GlobalSearch
 */
function defineGeneralServices(GlobalSearch) {

    function findInModel(Model, term, paging, req, res, asyncCallback) {

        Model.Search(term, paging, req, res)
            .then((result) => {
                var ret = underscore.map(result, function(item) {
                    return {
                        Type: Model.definition.name,
                        Data: item
                    };
                });
                asyncCallback(null, ret);
            }).catch((err) => {
                asyncCallback(err);
            });
    }

    /**
     * Search in 3 main models and paginate the results.
     * *Note* : At future we should add some filters like ranks of entities.
     * @param {string} term
     * @param {object} paging
     * @param {HttpResquest} req
     * @param {HttpResponse} res
     * @param {Callback} cb
     * @returns {Promise}
     */
    GlobalSearch.Search = function(term, paging, req, res, cb) {
        cb = cb || promiseCallback();


        if (paging.limit === 0)
            paging.limit = app.settings.pagination.globalSearch.limit;

        //because of 3 main models and union them
        if (paging.limit < 3)
            paging.limit = 3;

        //not to interfere in pagination remote hook
        var pagingCloned = underscore.clone(paging);

        // pagingCloned.limit = Math.floor(pagingCloned.limit / 3);

        async.parallel([
            function(houseCb) {
                findInModel(app.models.House, term, pagingCloned, req, res, houseCb);
            }
            // function (attractionCb) {
            //     findInModel(app.models.Attraction, term, pagingCloned, req, res, attractionCb);
            // },
            // function (cityCb) {
            //     findInModel(app.models.City, term, pagingCloned, req, res, cityCb);
            // }
        ], function(err, result) {
            if (err) return cb(err);

            result = result || [];
            result = underscore.flatten(result);
            result = underscore.shuffle(result);
            cb(null, result);
        });

        return cb.promise;
    };
}

/**
 * Defines after/before remotes for global searching
 * @param {Model} GlobalSearch
 */
function defineHooks(GlobalSearch) {

    GlobalSearch.beforeRemote("Search", Pagination.RemoteHooks.argumentWrapper(['term']));

    /**
     * Refine pagination arg
     */
    GlobalSearch.beforeRemote("Search", Pagination.RemoteHooks.refinePaginationParams);

    GlobalSearch.afterRemote("Search", Pagination.RemoteHooks.afterPaginatedService);

    GlobalSearch.afterRemote("Search", function(ctx, instance, next) {
        var result = ctx.result;
        // console.log('total %d', result.length, result);
        result = underscore.map(result, function(item) {
            var dtoModel = loopback.findModel(item.Type + "DTO");
            var converted = dtoModel.Convert(item.Data, {});
            
            // // @TODO -- find a better solution -- by Aref
            if (converted.pictures && converted.pictures.length) {
                var pics = [];
                converted.pictures.forEach(function(p) {
                    pics.push(p.url);
                });
                converted.pictures = pics;
            }

            return {
                Type: item.Type,
                Data: converted
            };
        });
        ctx.result = result;
        next();
    });
}

/**
 * Define API endpoints
 * @param GlobalSearch
 */
function defineRemoteMethods(GlobalSearch) {
    GlobalSearch.remoteMethod("Search", {
        description: "Search in models",
        accepts: [{
            arg: 'term',
            type: 'string',
            required: true,
            http: function(ctx) {
                var req = ctx.req;
                return (req.query && req.query.term) ? req.query.term : "";
            }
        }, {
            arg: 'paging',
            type: 'object',
            required: true,
            http: function(ctx) {
                var req = ctx.req;
                var query = req.query;
                var ret = { limit: 0, skip: 0 };
                if (!query || !query.filter) {
                    return ret;
                }

                var filter = query.filter;
                if (filter.limit) {
                    ret.limit = parseInt(filter.limit);
                }
                if (filter.skip) {
                    ret.skip = parseInt(filter.skip);
                }
                return ret;
            }
        }, {
            arg: 'req',
            type: 'object',
            required: true,
            http: {
                source: 'req'
            }
        }, {
            arg: 'res',
            type: 'object',
            required: true,
            http: {
                source: 'res'
            }
        }],
        returns: {
            arg: "result",
            type: "array",
            root: true
        },
        http: {
            path: "/",
            verb: "get",
            status: 200
        }
    });
}
