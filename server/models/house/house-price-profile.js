//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Common = require('narengi-utils').Common;
var Persistency = require('narengi-utils').Persistency;
var debug = require('debug')('narengi:geo:house:price-profile');
var app = serverRequire('server');
var underscore = require('underscore');

module.exports = function(HousePriceProfile) {
    defineServices(HousePriceProfile);
};

function refineInputData(data) {
    if (!data) return;

    var defPrice = app.models.Price.ZeroValue();

    if (data.extraGuestFee) {
        data.extraGuestFee = underscore.defaults(data.extraGuestFee, defPrice);
    }

    if (data.securityDeposit) {
        data.securityDeposit = underscore.defaults(data.securityDeposit, defPrice);
    }
}

function defineServices(HousePriceProfile) {

    HousePriceProfile.RefineInput = function(data) {
        if (!data) return;
        var defPrice = app.models.Price.ZeroValue();
        if (data.extraGuestFee) {
            data.extraGuestFee = underscore.defaults(data.extraGuestFee, defPrice);
        }
        if (data.securityDeposit) {
            data.securityDeposit = underscore.defaults(data.securityDeposit, defPrice);
        }
        return data;
    };
    /**
     * Set/Update price profile
     * @param {House} house
     * @param {object} data Input Data
     * @param {Callback} cb
     * @returns {Promise}
     */
    HousePriceProfile.SetForHouse = function(house, data, cb) {
        cb = cb || Common.PromiseCallback();
        debug("SetForHouse() => Input data : %j", data);

        refineInputData(data);

        if (!house.priceProfile.value()) {
            house.priceProfile.build({});
        }
        house.priceProfile.update(data).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

}
