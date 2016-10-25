//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var app = serverRequire('server');
var lodash = require('lodash');

module.exports = function(Model) {
    defineServices(Model);
};

function defineServices(Model){
    Model.GetProvinces = function(cb){
        Model.find({order: "province ASC, city ASC"}, function(err, all){
            if(err) return cb(err);
            var ret = lodash.groupBy(all, function(entity){
                return entity.province;
            });
            cb(null, ret);
        });
    };

    Model.remoteMethod("GetProvinces", {
        returns: {
            arg: 'provinces', type: 'object', root: true
        },
        http: {verb: 'get', path: "/"}
    });
}
