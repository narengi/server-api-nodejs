//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var app = serverRequire('server');
var lodash = require('lodash');

module.exports = function (options) {

    options = options || {};
    var ErrorClass = 'NarengiError';
    var stack = options.stack === true;

    return function (err, req, res, next) {
        if(!err) return next();

        var i18n = app.i18n;

        if(err.constructor.name === ErrorClass){
            var e = {};
            e.message = err.message;
            e.statusCode = err.statusCode;
            e.code = err.code;
            e.translation = i18n.__(e.message);
            return next(e);
        }
        if(err.constructor.name === 'ValidationError'){
            if(err.message.indexOf('error.user.validation.email_existed') > -1){
                var e = {};
                e.message = 'error.user.validation.email_existed';
                e.statusCode = err.statusCode;
                e.code = err.code;
                e.translation = i18n.__(e.message);
                return next(e);
            }
        }

        next(err);
    };
};