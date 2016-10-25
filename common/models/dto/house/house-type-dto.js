/*
 * Author : Ebrahim Pasbani (e.pasbani@gmail.com)
*/

var app = serverRequire('server');

module.exports = function(HouseTypeDTO) {
    HouseTypeDTO.Convert = function (houseType, options) {
        var dto = this.base.convert(houseType, HouseTypeDTO, options);
        return dto;
    };
};
