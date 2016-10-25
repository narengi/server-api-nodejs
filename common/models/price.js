//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var money = require('money');
var app = serverRequire('server');

module.exports = function (Price) {

    /**
     * Converts from current currency to new currency
     * @param {string} currency new Currency
     */
    Price.prototype.convertTo = function (currency) {
        var Currency = app.models.Currency;
        var newCurr = Currency.Get(currency);
        if (!newCurr) {
            newCurr = Currency.Default;
        }
        return money.convert(this.amount, {from: this.currency, to: newCurr.toString()});
    };

    Price.ZeroValue = function () {
        var Currency = app.models.Currency;
        return {amount: 0, currency: Currency.Default.toString()};
    };
};
