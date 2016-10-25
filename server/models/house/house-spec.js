//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var underscore = require('underscore');

module.exports = function (HouseSpec) {
    HouseSpec.Create = function (data) {
        data = data || {};
        var props = HouseSpec.definition.properties;
        props = underscore.keys(props);
        var result = {};
        underscore.each(props, function (key, index, list) {
            var def = 0;
            if (data[key]) {
                def = data[key];
            }
            result[key] = def;
        });
        return result;
    };

    HouseSpec.RefineInput = function (data) {
        data = data || {};
        var result = {};
        var props = HouseSpec.definition.properties;
        props = underscore.keys(props);
        underscore.each(props, function (key, index, list) {
            try {
                result[key] = parseInt(data[key]);
            }
            catch (ex) {
            }
        });
        return result;
    };
};