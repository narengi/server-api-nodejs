//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = exports;

exports.Errors = require('./errors');

exports.Service = require('./service').Service;

exports.Results = require('./results');

var ServiceClass = exports.Service;

exports.CreateService = function(options){
    options = options || {};
    if(options.vendor === 'kavenegar'){
        var VendorClass = require('./kavenegar/index').Service;
        return new ServiceClass(new VendorClass(options), options.vendor);
    }
    return new ServiceClass(null, 'unknowns');
};