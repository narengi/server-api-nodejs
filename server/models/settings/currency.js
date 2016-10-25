//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Enum = require('enum');
var app = serverRequire('server');
var underscore = require('underscore');
var money = require('money');
var Common = require('narengi-utils').Common;

/**
 * `Currency` model is a wrapper around an `Enum` object as `CurrencyEnum`
 * @param Currency
 */
module.exports = function (Currency) {
    defineEnum(Currency);
    defineServices(Currency);
};

function defineEnum(Currency) {

    //just currencies defined in system configuration
    var currencyList = app.settings.currency.available;
    var currencyMap = underscore.object(currencyList, currencyList);

    var currencyEnum = new Enum(
        currencyMap
        , {
            name: "CurrencyEnum",
            ignoreCase: true,
            freez: true
        }
    );

    Object.defineProperty(Currency, "CurrencyEnum", {
        get: function () {
            return currencyEnum;
        }
    }, {
        enumerable: true
    });

    Object.defineProperty(Currency, "Default", {
        get: function () {
            return currencyEnum.get(app.settings.currency.default);
        }
    }, {
        enumerable: false,
        configurable: false,
        writable: false
    });
}

function defineServices(Currency) {

    /**
     * Returns `Enum` object corresponding `currency` input.
     * @param {string} currency
     * @returns {Enum}
     */
    Currency.Get = function (currency) {
        return Currency.CurrencyEnum.get(currency);
    };

    /**
     * Returns all currencies defined in system.
     * @param {Callback} cb
     * @returns {Promise}
     */
    Currency.GetAll = function (cb) {
        cb = cb || Common.PromiseCallback();
        cb(null, Currency.CurrencyEnum.toJSON());
        return cb.promise;
    };

    Currency.remoteMethod(
        'GetAll', {
            description: 'Get all currencies as an object.',
            returns: {
                arg: 'currencies',
                type: 'object',
                root: true
            },
            http: {
                path: "/",
                verb: 'get',
                status: 200
            }
        }
    );
}