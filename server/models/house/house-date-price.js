//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var Common = require('narengi-utils').Common;
var Persistency = require('narengi-utils').Persistency;
var async = require('async');
var underscore = require('underscore');
var moment = require('moment');
var debug = require('debug')('narengi:geo:house:date-price');
var app = serverRequire('server');

module.exports = function (HouseDatePrice) {
    defineServices(HouseDatePrice);
};

function defineServices(HouseDatePrice) {

    /**
     * Add price for each date.
     * Any date is acceptable. Dates are not needed to be available date.
     * @param {House} house House model
     * @param {array} datePricesIn JS Date. An array containing objects with fields `date` and `price` object.
     * ```
     * [
     *  {
     *      date: "",
     *      price: {amount: N, currency: ""}
     *  }
     * ]
     * ```
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseDatePrice.AddOrUpdate = function (house, datePricesIn, cb) {
        if (!datePricesIn) return cb(Persistency.Errors.DataEmpty());
        cb = cb || Common.PromiseCallback();
        var Currency = app.models.Currency;

        async.waterfall([
                //refine inputs
                function (callback) {
                    var defCurrency = Currency.Default.toString();
                    var withoutRedundant = {};
                    underscore.each(datePricesIn, function (item) {
                        item.date = moment.utc(item.date).format("YYYY-MM-DD");
                        if (!item.price) {
                            item.price = {};
                        }
                        item.price = underscore.defaults(item.price, {amount: 0, currency: defCurrency});
                        if (!Currency.Get(item.price.currency))
                            item.price.currency = defCurrency;
                        withoutRedundant[item.date] = item;
                    });

                    datePricesIn = underscore.values(withoutRedundant);
                    debug("AddOrUpdate() => refined input : %j", datePricesIn);
                    callback(null, datePricesIn);
                },
                //find existing
                function (datePrices, callback) {
                    var dateRange = underscore.map(datePrices, function (item) {
                        return item.date;
                    });
                    house.__get__prices({
                        where: {date: {inq: dateRange}}
                    }, function (err, dates) {
                        if (err) return callback(err);
                        dates = dates || [];
                        underscore.each(dates, function (item) {
                            item.date = moment.utc(item.date).format("YYYY-MM-DD");
                        });
                        callback(null, dates, datePrices, dateRange);
                    });
                },
                //split `datePrices` which are persisted
                function (existingPersisted, datePrices, dateRange, callback) {
                    var datePricesToBeUpdated = underscore.map(existingPersisted, function (item) {
                        return {
                            entity: item,
                            data: underscore.find(datePrices, function (datePrice) {
                                return moment.utc(datePrice.date).isSame(item.date);
                            })
                        };
                    });
                    datePricesToBeUpdated = underscore.filter(datePricesToBeUpdated, function (item) {
                        return item.entity && item.data;
                    });
                    var datePricesToBeInserted = underscore.difference(datePrices, underscore.pluck(datePricesToBeUpdated, "data"));

                    debug("AddOrUpdate() => Existing DatePrices : %j", existingPersisted);
                    debug("AddOrUpdate() => ToBeUpdated : %j", datePricesToBeUpdated);
                    debug("AddOrUpdate() => ToBeInserted : %j", datePricesToBeInserted);
                    callback(null, datePricesToBeInserted, datePricesToBeUpdated);
                }
            ],
            //datePricesToBeUpdated is an array of `object` like
            //```
            // {entity: object, data: object}
            //```
            function (err, datePricesToBeInserted, datePricesToBeUpdated) {
                if (err) return cb(err);

                async.parallel([
                    //insert
                    function (callback) {
                        house.__create__prices(datePricesToBeInserted, function (e, result) {
                            if (e) return callback(e);
                            callback(null, result);
                        });
                    },
                    //update
                    function (callback) {
                        var updatedList = [];
                        async.each(datePricesToBeUpdated, function (toBeUpdated, toBeUpdatedCallback) {
                            toBeUpdated.entity.updateAttributes(toBeUpdated.data, function (innerErr, updatedEntity) {
                                if (innerErr) return toBeUpdatedCallback(innerErr);
                                updatedList.push(updatedEntity);
                                toBeUpdatedCallback(null);
                            });
                        }, function (err) {
                            if (err) return callback(err);
                            callback(null, updatedList);
                        });
                    }
                ], function (pErr, result) {
                    if (pErr) return cb(pErr);
                    result = underscore.flatten(result, true);
                    debug("AddOrUpdate() => The result is : %j", result);
                    cb(null, result);
                });
            });
        return cb.promise;
    };

    //========================================================================================

    /**
     * Returns all date prices between `startDate` and `endDate`.
     * Implicitly this method create a default price for dates not existed in storage.
     * Dates are inclusive.
     * @param {House} house
     * @param {string} startDate Start date string in ISO format
     * @param {string} endDate End date string in ISO format
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseDatePrice.GetInRange = function (house, startDate, endDate, cb) {
        cb = cb || Common.PromiseCallback();

        var defCurrency = app.models.Currency.Default.toString();
        var defPrice = {amount: 0, currency: defCurrency};

        async.waterfall([
            //create date range
            function (callback) {
                dates = Common.Dates.DateRange(startDate, endDate);
                debug("GetInRange() => Refined dates : %j", dates);
                callback(null, dates);
            },
            //find persisted
            function (dates, callback) {
                //should clone because database connector change format of `dates` array
                var clonedDates = underscore.clone(dates);
                house.prices(
                    {
                        where: {date: {inq: clonedDates}},
                        order: "date ASC"
                    }, function (error, foundEntities) {
                        if (error) return callback(error);
                        callback(null, foundEntities || [], dates);
                    });
            },
            //create default values for those one not persisted
            function (foundEntities, dates, callback) {
                var persistedDates = underscore.map(foundEntities, function (item) {
                    console.log(item);
                    return moment.utc(item.date).format("YYYY-MM-DD");
                });
                var unPersistedDates = underscore.difference(dates, persistedDates);
                var toBeMerged = underscore.map(unPersistedDates, function (item) {
                    return {
                        //houseId: house.id, //not needed. because it's fake data not to be persisted
                        date: moment.utc(item).toDate(),
                        price: defPrice
                    };
                });
                debug("GetInRange() => Persisted dates : %j", persistedDates);
                debug("GetInRange() => To be merged if not existed objects : %j", unPersistedDates);
                var result = toBeMerged.concat(foundEntities);
                callback(null, result);
            }
        ], function (error, result) {
            debug("GetInRange() => Final result : %j", result);
            if (error) return cb(error);
            result = result || [];
            result = underscore.sortBy(result, function(item){
                return moment.utc(item.date).toDate();
            });
            cb(null, result);
        });

        return cb.promise;
    };

    //========================================================================================

    /**
     * Set prices of dates which are in date range between `startDate` and `endDate` to zero.
     * @param {House} house
     * @param {array} dates Array of date strings in ISO format
     * @param {Callback} cb
     * @returns {Promise}
     */
    HouseDatePrice.UnSetInRange = function (house, dates, cb) {
        cb = cb || Common.PromiseCallback();
        var defCurrency = app.models.Currency.Default.toString();
        dates = Common.Dates.Normalize(dates);
        async.waterfall([
            //find those one to be unset
            function (callback) {
                house.prices({date: {inq: dates}}, function (error, entities) {
                    if (error) return callback(error);
                    callback(null, entities || []);
                });
            },
            //do unset
            function (entities, callback) {
                async.each(entities, function (datePrice, eachCallback) {
                    datePrice.updateAttributes({price: {amount: 0, currency: defCurrency}}, function (error, updated) {
                        if (error) return eachCallback(error);
                        eachCallback(null);
                    });
                }, function (error) {
                    if (error) return callback(error);
                    callback(null);
                });
            }
        ], function (error, result) {
            if (error) return cb(error);
            cb(null, []);
        });
        return cb.promise;
    };
}