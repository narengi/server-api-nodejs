//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Persistency = require('./index');

module .exports = exports;

/**
 * Wraps a callback for handling successful situations
 * @param  {Function} cb `loopback` callback
 */
exports.successHandler = function(cb) {
    var callback = cb;
    return function(obj) {
        if(!obj) return callback(Persistency.Errors.NotFound());
        callback(null, obj);
    };
};

/**
 * Wraps a callback for handling successful situations
 * - Use this for array
 * @param  {Function} cb `loopback` callback
 */
exports.arraySuccessHandler = function(cb) {
    var callback = cb;
    return function(obj) {
        callback(null, obj);
    };
};

/**
 * Wraps a callback for handling failure situations
 * @param  {Function} cb `loopback` callback
 */
exports.failureHandler = function(cb) {
    var callback = cb;
    return function(err) {
        callback(err);
    };
};