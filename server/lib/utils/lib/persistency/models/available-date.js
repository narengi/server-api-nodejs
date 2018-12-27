"use strict";
//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var moment = require('moment');
var Enum = require('enum');

module.exports = exports;

/**
 * Class `AvailableDate` indicating house available date.
 * @class
 */
exports.HouseAvailableDate = class {

    constructor() {
        console.log('Calling HouseAvailableDate constructor : ' + arguments);
        if (arguments && arguments.length == 2) {
            this.date = arguments[0];
            this.type = arguments[1];
        }
        else {
            this._date = moment();
            this._type = FillType.Default;
        }
    }

    get date() {
        if (this._date) {
            return this._date.toDate();
        }
        else {
            return null;
        }
    }

    set date(value) {
        //TODO: add validation here
        if (!value) {
            this._date = null;
        }
        else {
            this._date = moment(value);
        }
    }

    get type() {
        if (!this._type) {
            this._type = FillType.Default;
        }
        return this._type.value;
    }

    set type(value) {
        if (!value) {
            this._type = null;
        }
        else {
            var tempType = FillType.get(value);
            if (!tempType) {
                tempType = FillType.Default;
            }
            this._type = tempType;
        }
    }

    toJSON() {
        var ret = {
            date: this.date,
            type: this.type
        };
        return ret;
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }

};

var FillType = new Enum({'Default': 'default', 'ByAdmin': 'by-admin', 'ByOwner': 'by-owner'}, {
    name: 'HouseAvailableDateFillType',
    freez: true,
    ignoreCase: true
});