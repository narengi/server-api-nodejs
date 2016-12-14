//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var underscore = require('underscore');

function getPictures(house) {
    var apiArr = [];
    underscore.each(house.pictures, function (picture) {
        var api = {};
        api.url = `/houses/${house.id}/pictures/${picture.hash}`;
        api.styles = underscore.reduce(picture.styles, function (memo, stylePack) {
            return underscore.extend(memo, stylePack.style);
        }, {});
        apiArr.push(api);
    });
    return apiArr;
}

module.exports = function (HouseDTO) {
    HouseDTO.Convert = function (house, options) {
        return this.base.convert(house, HouseDTO, options);
    };

    HouseDTO.convertForMobile = function (house, options) {
        var dto = this.base.convert_internal(house, HouseDTO, options);
        dto.pictures = getPictures(house);
        dto.type = house.type;
        dto.detailUrl = house.getDetailUrl();
        dto.dates = house.dates;
        return dto;
    };

    HouseDTO.convertForWeb = function (house, options) {
        var dto = this.convertForMobile(house, options);
        return dto;
    };
    
    HouseDTO.GetPictures = getPictures;
};
