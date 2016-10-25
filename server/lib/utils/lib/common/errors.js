//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var underscore = require('underscore');

module.exports = exports;

function refine(defaults, params) {
    params = underscore.pick(params, underscore.keys(defaults));
    params = underscore.defaults(params, defaults);
    return params;
}

function NarengiError(){}
NarengiError.prototype = new Error();
NarengiError.prototype.constructor = NarengiError;

var makeError = function(defaults, params) {
    params = refine(defaults, params || {});
    var error = new NarengiError();
    error.statusCode = params.statusCode;
    error.code = params.code;
    error.message = params.message;
    return error;
};

exports.makeError = makeError;

exports.GeneralError = function(params) {
    var defaults = {
        message: 'error.common.internal',
        statusCode: 500,
        code: 'INTERNAL'
    };
    return makeError(defaults, params);
};

exports.DataEmpty = function(params) {
    var defaults = {
        message: 'error.common.data_is_empty',
        statusCode: 400,
        code: 'DATA_IS_EMPTY'
    };
    return makeError(defaults, params);
};

exports.InternalError = function(params) {
    var defaults = {
        message: 'error.common.internal',
        statusCode: 500,
        code: 'INTERNAL'
    };
    return makeError(defaults, params);
};