//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var CommonErrors = require('narengi-utils').Common.Errors;

module .exports = exports;

exports.NotFound = function(params) {
    var defaults = {
        message: 'error.persistency.not_found',
        statusCode: 404,
        code: 'NOT_FOUND'
    };
    return CommonErrors.makeError(defaults, params);
};

exports.Existed = function(params) {
    var defaults = {
        message: 'error.persistency.existed',
        statusCode: 400,
        code: 'EXISTED'
    };
    return CommonErrors.makeError(defaults, params);
};

exports.NotSaved = function(params) {
    var defaults = {
        message: 'error.persistency.not_saved',
        statusCode: 400,
        code: 'EXISTED'
    };
    return CommonErrors.makeError(defaults, params);
};