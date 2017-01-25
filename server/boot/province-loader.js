'use strict';

var path = require('path');
var async = require('async');
var lineReader = require('line-reader');

module.exports = function (app, cb) {
    /*
     * The `app` object provides access to a variety of LoopBack resources such as
     * models (e.g. `app.models.YourModelName`) or data sources (e.g.
     * `app.datasources.YourDataSource`). See
     * http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
     * for more info.
     */

    var Model = app.models.ProvinceCity;

    async.waterfall([
        function (callback) {
            Model.count({}).then((count) => {
                if (count > 0) return callback(count);
                callback(null, 0);
            }).catch((e) => {
                callback(0); //fake error to bypass next phase
            });
        },
        function (count, callback) {
            var arr = [];
            lineReader.eachLine(path.join(__dirname, '../../bin/province-city.json'), (line, last) => {
                var obj = JSON.parse(line);
                delete obj._id;
                arr.push(obj);
                if(last === true){
                    async.each(arr, function(obj, scb){
                        Model.create(obj, (e, entity) => {
                            scb(null);
                        });
                    }, (err) => {
                        callback(null);
                    });
                }
            });
        }
    ], function (e, result) {
        process.nextTick(cb);
    });
};
