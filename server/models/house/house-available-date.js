//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Enum = require('enum');
var underscore = require('underscore');
var async = require('async');
var debug = require('debug')('narengi:geo:house:available-dates');
var moment = require('moment');
var Common = require('narengi-utils').Common;

module.exports = function (HouseAvailableDate) {
    defineTypes(HouseAvailableDate);
    defineServices(HouseAvailableDate);
};

function defineTypes(HouseAvailableDate) {

    var fillType = new Enum({
        'Default': 'default',
        'ByAdmin': 'by_admin',
        'ByOwner': 'by_owner'
    }, {
        name: "HouseAvailableDateFillType",
        ignoreCase: true,
        freez: true
    });

    Object.defineProperty(HouseAvailableDate, "FillTypeEnum", {
        get: function () {
            return fillType;
        }
    }, {
        enumerable: true
    });

    HouseAvailableDate.MatchType = function (isAdmin, isOwner) {
        if (isAdmin) return HouseAvailableDate.FillTypeEnum.get('ByAdmin');
        if (isOwner) return HouseAvailableDate.FillTypeEnum.get('ByOwner');
        return HouseAvailableDate.FillTypeEnum.get('Default');
    };
}

function defineServices(HouseAvailableDate) {

    Object.defineProperty(HouseAvailableDate.prototype, "fillType", {
        get: function () {
            return HouseAvailableDate.FillTypeEnum.get(this.type);
        }
    }, {
        enumerable: false
    });


    /**
     * Add dates as available dates for `house`.
     * It adds only non-existing dates in storage.
     * @param {House} house
     * @param {array} inDates
     * @param {boolean} isAdmin
     * @param {boolean} isOwner
     * @param {Callback} cb
     */
    HouseAvailableDate.AddDates = function (house, inDates, isAdmin, isOwner, cb) {
        cb = cb || Common.PromiseCallback();

        if (!inDates) {
            cb(Common.Errors.DataEmpty());
        }
        else {
            async.waterfall([
                function (callback) {
                    house.__get__availableDates(function (err, dates) {
                        callback(null, dates || []);
                    });
                },
                function (dates, callback) {
                    var persistedDates = underscore.map(dates, function (avDate) {
                        return moment(avDate.date).format("YYYY-MM-DD");
                    });
                    var refined = underscore.difference(inDates, persistedDates);

                    debug("input dates : %j", inDates);
                    debug("persisted dates : %j", persistedDates);
                    debug("refined dates : %j", refined);

                    callback(null, refined);
                }
            ], function (err, dates) {
                if (err) return cb(err);
                if (!dates || dates.length < 1) return cb(null, []);

                var fillBy = HouseAvailableDate.MatchType(isAdmin, isOwner);

                var persistingObjects = underscore.map(dates, function (date) {
                    return {
                        date: date,
                        type: fillBy,
                        houseId: house.id
                    };
                });

                house.__create__availableDates(persistingObjects, cb);
            });
        }

        return cb.promise;
    };

    /**
     * Remove dates as unavailable dates for `house`.
     * @param {House} house
     * @param {array} dates
     * @param {Callback} cb
     */
    HouseAvailableDate.DeleteDates = function (house, dates, cb) {
        cb = cb || Common.PromiseCallback();

        house.__delete__availableDates({
            date: {inq: dates}
        }, cb);

        return cb.promise;
    };

    /**
     * Returns dates which are in `startDate`-`endDate` range.
     * @param {House} house
     * @param {Date} startDate
     * @param {Date} endDate
     * @param {Callback} cb
     */
    HouseAvailableDate.GetDatesInRange = function (house, startDate, endDate, cb) {
        cb = cb || Common.PromiseCallback();
        house.__get__availableDates({
            date: {between: [startDate, endDate]}
        }, function (err, dates) {
            if (err) return cb(err);
            cb(null, dates);
        });
        return cb.promise;
    };
}