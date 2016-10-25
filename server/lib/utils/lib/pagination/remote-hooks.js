//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var loopback = require('loopback');
var jsUri = require('jsuri');
var debug = require('debug')('narengi-utils:pagination');
var app = require('narengi-utils').Common.app;

module.exports = exports;

/**
 * Wraps needed arguments in before remote hook to use in corresponding after remote
 * @param {array} neededQuery
 * @returns {Function}
 */
exports.argumentWrapper = function (neededQuery) {

    /**
     * Before remote
     * @param {AccessContext} ctx
     * @param {Model} instance
     * @param {Callback} next
     */
    return function (ctx, instance, next) {
        var needed = [];
        if (neededQuery) {
            needed = neededQuery;
        }
        ctx.req.paginationNeededQuery = needed;
        next();
    }
};

/**
 * Before remote to refine pagination params
 * @param {AccessContext} ctx
 * @param {Model} instance Not used
 * @param {Callback} next
 */
exports.refinePaginationParams = function (ctx, instance, next) {
    var paging = ctx.args.paging;
    if (!paging.limit) {
        paging.limit = parseInt(app().settings.pagination.default.limit);
    }
    if (paging.limit < 1) {
        paging.limit = 10;
    }
    ctx.args.paging = paging;
    next();
};

/**
 * Enriches http `response` with necessary headers
 * @param {AccesContext} ctx
 * @param {Model} instance Not used
 * @param {Callback} next
 */
exports.afterPaginatedService = function (ctx, instance, next) {
    var modelName = ctx.method.sharedClass.name;
    var model = loopback.getModel(modelName);
    var paging = ctx.args.paging;
    model.count(paging.where).then(countedHandler(ctx)).catch(() => {
        next()
    });

    function countedHandler(context) {
        var ctx = context;
        var paging = ctx.args.paging;
        var neededQuery = ctx.req.paginationNeededQuery || [];

        return function (count) {
            ctx.res.append("X-Total-Count", count);

            // if there are instances then response header links should be injected
            if (count > 0) {
                var limit = paging.limit;
                var skip = paging.skip;

                try {
                    var links = "";
                    links += firstLink(limit, skip, count);
                    links += beforeLink(limit, skip, count);
                    links += nextLink(limit, skip, count);
                    links += lastLink(limit, skip, count);
                    ctx.res.append("Link", links);
                } catch (ex) {
                    debug("Error : %j", ex);
                }
            }
            next();
        };


        function createLink(limit, skip) {
            var uri = new jsUri();
            uri.setPath(ctx.req.baseUrl + ctx.method.http.path);
            neededQuery.forEach(function (item, index, collection) {
                uri.addQueryParam(item, ctx.args[item]);
            });
            uri.addQueryParam("filter[limit]", limit);
            uri.addQueryParam("filter[skip]", skip);
            return uri.toString();

        }

        function beforeLink(limit, skip, total) {
            var calcLimit = limit, calcSkip = skip;
            if (skip > limit) {
                calcSkip -= limit;
            }
            else {
                calcSkip = 0;
            }
            return createLink(calcLimit, calcSkip) + "; rel=\"prev\"";
        }

        function nextLink(limit, skip, total) {
            var calcLimit = limit, calcSkip = skip;
            if ((skip + limit) <= total) {
                calcSkip += limit;
            }
            else {
                //do nothing, don't change url
            }
            return createLink(calcLimit, calcSkip) + "; rel=\"next\"";
        }

        function firstLink(limit, skip, total) {
            var calcLimit = limit, calcSkip = 0;

            return createLink(calcLimit, calcSkip) + "; rel=\"first\"";
        }

        function lastLink(limit, skip, total) {
            var calcLimit = limit, calcSkip = skip;

            calcSkip = Math.floor(total / limit) * limit;

            return createLink(calcLimit, calcSkip) + "; rel=\"last\"";
        }
    }
};