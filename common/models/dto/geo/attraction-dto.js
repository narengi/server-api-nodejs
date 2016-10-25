//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var underscore = require('underscore');

function getPictures(attraction) {
    var apiArr = [];
    underscore.each(attraction.pictures, function (picture) {
        var api = {};
        api.url = `/attractions/${attraction.id}/pictures/${picture.hash}`;
        api.styles = underscore.reduce(picture.styles, function (memo, stylePack) {
            return underscore.extend(memo, stylePack.style);
        }, {});
        apiArr.push(api);
    });
    return apiArr;
}


module.exports = function (AttractionDTO) {
    AttractionDTO.Convert = function (attraction, options) {
        return this.base.convert(attraction, AttractionDTO, options);
    };

    AttractionDTO.convertForMobile = function (attraction, options) {
        var dto = this.base.convert_internal(attraction, AttractionDTO, options);
        dto.pictures = getPictures(attraction);
        return dto;
    };

    AttractionDTO.convertForWeb = function (attraction, options) {
        var dto = this.convertForMobile(attraction, options);
        return dto;
    };
};
