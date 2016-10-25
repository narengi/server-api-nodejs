//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var CommonErrors = require('narengi-utils').Common.Errors;

module.exports = exports;

exports.UserIsNotAdmin = function(params) {
    var defaults = {
        message: 'error.user.not_admin',
        statusCode: 401,
        code: 'NOT_ADMIN'
    };
    return CommonErrors.makeError(defaults, params);
};

exports.NotAuthorized = function(params) {
    var defaults = {
        message: 'error.user.not_authorized',
        statusCode: 401,
        code: 'NOT_AUTHORIZED'
    };
    return CommonErrors.makeError(defaults, params);
};