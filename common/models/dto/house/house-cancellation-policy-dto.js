//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = function (HouseCancellationPolicyDTO) {
    HouseCancellationPolicyDTO.Convert = function (date, options) {
        options = options || {};
        var dto = HouseCancellationPolicyDTO.base.convert(date, HouseCancellationPolicyDTO, options);
        return dto;
    };
};
