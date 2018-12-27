//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var lodash = require('lodash');

module.exports = function (DTO) {
    DTO.Convert = function (entity, options) {
        return this.base.convert(entity, DTO, options);
    };

    DTO.convertForMobile = function (entity, options) {
        var dto = this.base.convert_internal(entity, DTO, options);
        if (!options.forGuest) { //false or undefined or null
            delete dto.securityCode;
        }
        return dto;
    };

    DTO.convertForWeb = function (entity, options) {
        var dto = this.convertForMobile(entity, options);
        return dto;
    };
};