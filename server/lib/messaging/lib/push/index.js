//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = exports;

exports.Errors = require('./errors');

var ServiceClass = require('./service').Service;

/**
 * Creates a service proxying destination PN system
 * @param {Object} options
 */
exports.CreateService = function(options){
  options = options || {};
    if(!options.deviceType)
        throw new exports.Errors.SystemDefinitionWrong();

  var osTypeClass = null;
    if(options.deviceType.toLowerCase() === 'android'){
      osTypeClass = require('./gcm').Service;
    }
    else if(options.deviceType.toLowerCase() === 'ios'){
      osTypeClass = require('./apn').Service;
    }
  if(osTypeClass){
    return new ServiceClass(new osTypeClass(options), options.deviceType);
  }
    throw new exports.Errors.NotImplemented();
};