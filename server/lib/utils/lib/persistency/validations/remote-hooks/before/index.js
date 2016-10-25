//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');
var Persistency = require('../../../index');
var underscore = require('underscore');

module.exports = exports;

/**
 * Validate uniqueness of model based on keys
 * @param {string} modelName
 * @param {string} argName
 * @param {array} keys
 * @returns {Function}
 * @constructor
 */
exports.CheckUniqueness = function (modelName, argName, keys) {
    return function (ctx, instance, next) {
        var model = loopback.findModel(modelName);
        if (!model) {
            return next(Persistency.Errors.NotFound());
        }
        keys = keys || [];
        if (keys.length == 0) {
            return next();
        }

        var data = ctx.args[argName];
        if (!data) {
            return next();
        }

        var params = underscore.pick(data, keys);
        var def = {};
        keys.forEach(function(item){
            def[item] = null;
        });
        params = underscore.defaults(params, def);

        model.count(params).then(countedHandler).catch((/*err*/) => {
            next();
        });

        function countedHandler(count) {
            if (count > 0) {
                return next(Persistency.Validation.Errors.UniquenessViolation());
            }
            next();
        }
    };
};