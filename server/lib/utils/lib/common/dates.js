//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var moment = require('moment');
var underscore = require('underscore');

module.exports = exports;

/**
 * Creates an array consisting of dates from `startDate` to `endDate`.
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @param {object} options
 * ```
 * {
 * stringDate: {boolean} If true, each date representing date format string, else JS Date object
 * }
 * ```
 * @returns {Array}
 */
exports.DateRange = function (startDate, endDate, options) {
    options = options || {};

    var stringDate = options.hasOwnProperty("stringDate") ? options.stringDate : true;

    startDate = moment.utc(startDate);
    endDate = moment.utc(endDate);
    var dates = [];

    var currentDate = startDate.clone();
    while (!currentDate.isAfter(endDate, 'd')) {
        if (stringDate)
            dates.push(currentDate.format("YYYY-MM-DD"));
        else
            dates.push(currentDate.toDate());
        currentDate = currentDate.add(1, 'd');
    }
    dates = underscore.uniq(dates);
    return dates;
};

/**
 * Normalize dates in array.
 * @param {array} dates Containing strings representing dates.
 * @param {object} options
 * ```
 * {
 * stringDate: true|false, //If true, each date representing date format string, else JS Date object
 * format: {string},  //date format
 * sort: true|false
 * }
 * ```
 * @returns {array} Normalized dates
 */
exports.Normalize = function (dates, options) {
    options = options || {};
    dates = dates || [];
    var format = options.hasOwnProperty("format") ? options.format : "YYYY-MM-DD";
    var stringDate = options.hasOwnProperty("stringDate") ? options.stringDate : true;
    var sort = options.hasOwnProperty("sort") ? options.sort : false;
    dates = underscore.each(dates, function (item) {
        if (stringDate)
            item = moment.utc(item).format(format);
        else
            item = moment.utc(item).toDate();
    });
    dates = underscore.uniq(dates);
    if (sort)
        dates = underscore.sortBy(dates, function (item) {
            return moment.utc(item);
        });
    return dates;
};