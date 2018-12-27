//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var CommonErrors = require('narengi-utils').Common.Errors;

module.exports = exports;

exports.FileNotCorrectError = function (params) {
    var defaults = {
        message: 'error.http.file_not_correct',
        statusCode: 400,
        code: 'FILE_NOT_CORRECT'
    };
    return CommonErrors.makeError(defaults, params);
};

exports.FileUploadFailure = function (params) {
    var defaults = {
        message: 'error.http.file_not_uploaded',
        statusCode: 400,
        code: 'UPLOAD_FAILURE'
    };
    return CommonErrors.makeError(defaults, params);
};