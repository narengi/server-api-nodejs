//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = function (HouseCancellationPolicyDTO) {
    HouseCancellationPolicyDTO.Convert = function (date, options) {
        options = options || {};
        var dto = HouseCancellationPolicyDTO.base.convert(date, HouseCancellationPolicyDTO, options);
        return dto;
    };
};
