//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var CommonErrors = require('narengi-utils').Common.Errors;

module.exports = exports;

exports.UniquenessViolation = function(params){
    var defaults = {
        msg: 'error.persistency.uniqueness_violation',
        statusCode: 400,
        code: 'UNIQUNESS_VIOLATION'
    };
    return CommonErrors.makeError(defaults, params);
};