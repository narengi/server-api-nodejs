//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var app = serverRequire('server');

module.exports = function(HouseAvailableDateDTO) {
    HouseAvailableDateDTO.Convert = function (date, options) {
        options = options || {};
        options.skipId = true;
        var dto = HouseAvailableDateDTO.base.convert(date, HouseAvailableDateDTO, options);
        return dto;
    };
};
