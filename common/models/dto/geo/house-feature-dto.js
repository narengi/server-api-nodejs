//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = function(HouseFeatureDTO) {
    HouseFeatureDTO.Convert = function (feature, options) {
        return this.base.convert(feature, HouseFeatureDTO, options);
    };

    HouseFeatureDTO.convertForMobile = function (feature, options) {
        var dto = this.base.convert_internal(feature, HouseFeatureDTO, options);
        dto.icon = `/medias/feature/${dto.key}`;
        return dto;
    };

    HouseFeatureDTO.convertForWeb = function (feature, options) {
        return this.convertForMobile(feature, options);
    };
};
