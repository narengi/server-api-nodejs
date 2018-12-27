//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//
var underscore = require('underscore');

function refineProfile(account, profile) {
    if (!profile) return {};
    var ret = profile;
    var picture = ret.picture;
    if (underscore.isObject(picture)) {
        delete ret.picture;
        var api = {};
        api.url = `/user-profiles/${account.id}/picture/${picture.hash}`;
        api.styles = underscore.reduce(picture.styles, function (memo, stylePack) {
            return underscore.extend(memo, stylePack.style);
        }, {});
        ret.picture = api;
    }
    return ret;
}

module.exports = function (AccountDTO) {

    AccountDTO.Convert = function (account, options) {
        return this.base.convert(account, AccountDTO, options);
    };

    AccountDTO.convertForMobile = function (account, options) {
        if (!account) {
            return null;
        }
        var justProfile = options.justProfile === true;
        var dto = this.base.convert_internal(account, AccountDTO, options);
        dto.profileUrl = `/accounts/${dto.id}`;
        dto.profile = refineProfile(account, account.profile.value());
        dto.personId = account.personId;

        if (!justProfile) {
            var authToken = account.authToken.value() || {};
            dto.token = {
                username: account.usernameOrEmail(),
                token: authToken.token,
                type: authToken.type
            };
            var verfLst = [];
            if (account.lastVerificationOfType('none')) //this is for admin usually
                verfLst.push(account.lastVerificationOfType('none'));
            if (account.lastVerificationOfType('email'))
                verfLst.push(account.lastVerificationOfType('email'));
            if (account.lastVerificationOfType('sms'))
                verfLst.push(account.lastVerificationOfType('sms'));
            if (account.lastVerificationOfType('id'))
                verfLst.push(account.lastVerificationOfType('id'));
            verfLst = underscore.map(verfLst, function (item) {
                var ret = item.toJSON();
                delete ret.code;
                return ret;
            });
            dto.verifications = verfLst;
        }
        return dto;
    };

    AccountDTO.convertForWeb = function (account, options) {
        var dto = this.convertForMobile(account, options);
        if (dto && dto.token) delete dto.token;
        return dto;
    };
};
