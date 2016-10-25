//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var underscore = require('underscore');

function getPictures(city) {
    var apiArr = [];
    underscore.each(city.pictures, function (picture) {
        var api = {};
        api.url = `/cities/${city.id}/pictures/${picture.hash}`;
        api.styles = underscore.reduce(picture.styles, function (memo, stylePack) {
            return underscore.extend(memo, stylePack.style);
        }, {});
        apiArr.push(api);
    });
    return apiArr;
}


module.exports = function (CityDTO) {
    CityDTO.Convert = function (city, options) {
        return this.base.convert(city, CityDTO, options);
    };

    CityDTO.convertForMobile = function (city, options) {
        var dto = this.base.convert_internal(city, CityDTO, options);
        dto.pictures = getPictures(city);
        return dto;
    };

    CityDTO.convertForWeb = function (city, options) {
        var dto = this.convertForMobile(city, options);
        return dto;
    };
};
