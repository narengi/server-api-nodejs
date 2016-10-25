//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var CommonErrors = require('narengi-utils').Common.Errors;

module.exports = exports;

exports.FileNotFound = function (params) {
    var defaults = {
        message: 'error.filesystem.file_not_found',
        statusCode: 404,
        code: 'NOT_FOUND'
    };
    return CommonErrors.makeError(defaults, params);
};

exports.NoAccess = function(params) {
    var defaults = {
        message: 'error.filesystem.no_access',
        statusCode: 401,
        code: 'NO_ACCESS'
    };
    return CommonErrors.makeError(defaults, params);
};