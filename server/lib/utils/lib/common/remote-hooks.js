//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var changeCase = require('change-case');
var underscore = require('underscore');
var lodash = require('lodash');
var app = require('./application');
var loopback = require('loopback');
var Common = require('./index');
var debug = require('debug')('narengi-utils:common:remote-hooks');

module.exports = exports;


/**
 * Returns a map containg each property key in lowerCase as key and original as value
 */
function getModelKeyMap(modelName) {
    var result = {};
    try {
        var modelProperties = app().models[modelName].definition.properties;
        var modelKeys = underscore.keys(modelProperties);
        underscore.each(modelKeys, function (key) {
            result[changeCase.lowerCase(key)] = key;
        });
    } catch (e) {
    } finally {
    }
    return result;
}


/**
 * Make `request.body` comply model definition
 * Wraps a callback for handling successful situations
 * @param  {Function} cb `loopback` callback
 * @deprecated
 */
exports.correctCaseOfKeys = function (ctx, instance, next) {
    try {
        var data = ctx.req.body;
        if (!data) {
            return next(Common.Errors.DataEmpty());
        }

        var modelName = ctx.method.sharedClass.name;
        var modelKeys = getModelKeyMap(modelName);

        var result = {};

        var keys = underscore.keys(data);
        underscore.each(keys, function (key) {
            var loweredKey = changeCase.lowerCase(key);
            result[modelKeys[loweredKey]] = data[key];
        });

        ctx.req.body = result;

        next();
    } catch (e) {
        next();
    } finally {
    }
};

exports.correctCaseOfKeysInArg = function (argName, deep) {
    return function (ctx, instance, next) {
        try {
            var data = ctx.args[argName];
            if (!data) {
                return next();
            }

            if (deep === undefined) {
                deep = false;
            }

            var result = {};

            var keys = underscore.keys(data);
            underscore.each(keys, function (key) {
                var loweredKey = changeCase.snakeCase(key).toLowerCase();
                var innerData = data[key];
                if (deep) {
                    //if(typeof data[key] === 'object'){
                    if (lodash.isPlainObject(data[key])) {
                        var tmpInnerData = {};
                        underscore.each(underscore.keys(innerData), function (innerKey) {
                            tmpInnerData[changeCase.snakeCase(innerKey).toLowerCase()] = innerData[innerKey];
                        });
                        innerData = tmpInnerData;
                    }
                }
                result[loweredKey] = innerData;
            });

            ctx.args[argName] = result;
        } catch (e) {
        } finally {
            next();
        }
    };
};

/**
 * We should inject request body to `args` again. Because injection body to arguments is done at first calling of before remotes.
 * @param {Context} ctx
 * @param {Model} instance
 * @param {Callback} next
 */
exports.correctRequestData = function (ctx, instance, next) {
    ctx.args.data = ctx.req.body;
    next();
};

/**
 * Inject current language to data sent from client
 * @param {Context} ctx
 * @param {Model} instance
 * @param {Callback} next
 */
exports.injectLangToRequestData = function (ctx, instance, next) {
    ctx.args.data = ctx.args.data || {};
    ctx.args.data['lang'] = app().currentLocale;
    next();
};

/**
 * Wrapper for after remote hook to convert entity to DTO
 * @param {Model|string} Entity
 * @param {object} options
 * @returns {Function} Returns remote hook
 */
exports.convert2Dto = function (Entity, options) {

    /**
     * Converts entity to dto for API endpoints
     * @param {Context} ctx
     * @param {Model} instance
     * @param {Callback} next
     */
    return function (ctx, instance, next) {

        if (typeof Entity === "string") {
            Entity = loopback.getModel(Entity);
        }

        debug("Convert to DTO => model: %j, options: %j", Entity, options);

        try {
            options = options || {};
            if(options.byPassTransform === true){
                return next();
            }
            options.currentContext = ctx.req.narengi_context;
            options.ctx = ctx;

            var Model = loopback.findModel(Entity.definition.name + "DTO");
            if (!underscore.isObject(Model))
                return next();
            var result = ctx.result;
            if (underscore.isArray(result)) {
                result = Model.ConvertArray(result, options);
            }
            else {
                result = Model.Convert(result, options);
            }
            ctx.result = result;
            next();
        }
        catch (ex) {
            next(ex);
        }
    };
};

/**
 A `beforeRemote` hook validating input data for persisting in storage
 This method correct and sanitizes input data.
 * @deprecated
 **/
exports.dataOwnerCorrector = function (defaultForm) {
    return function (ctx, instance, next) {
        var data = ctx.req.body;
        if (!data) {
            return next(Common.Errors.DataEmpty());
        }

        data = underscore.pick(data, underscore.keys(defaultForm));
        ctx.req.body = data;
        next();
    };
};

/**
 * Picks just fields defined in model definition
 * @param {string} argName Argument name
 * @param {string} modelName Model name
 * @returns {Function}
 */
exports.dataOwnerCorrectorInArg = function (argName, modelName) {
    return function (ctx, instance, next) {
        var data = ctx.args[argName];
        if (!data) {
            return next(Common.Errors.DataEmpty());
        }

        var modelKeys = getModelKeyMap(modelName);

        data = underscore.pick(data, underscore.values(modelKeys));
        ctx.args[argName] = data;
        next();
    };
};

/**
 * Validates the http request body should not be empty
 * @param {Context} ctx
 * @param {Model} instance
 * @param {Callback} next
 * @deprecated
 */
exports.dataShouldNotEmpty = function (ctx, instance, next) {
    var data = ctx.req.body;
    if (!data)  return next(Common.Errors.DataEmpty());
    next();
};

/**
 * Factory for remote hook to validate the argument
 * @param {string} argName
 * @returns {Function}
 */
exports.argShouldNotEmpty = function (argName) {

    /**
     * Validates the http request body should not be empty
     * @param {Context} ctx
     * @param {Model} instance
     * @param {Callback} next
     */
    return function (ctx, instance, next) {
        var data = ctx.args[argName] || {};
        if (underscore.size(underscore.keys(data)) < 1) return next(Common.Errors.DataEmpty());
        next();
    };
};