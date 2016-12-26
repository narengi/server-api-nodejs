'use strict';

var _ = require('lodash');

module.exports = function(Model) {
  defineServices(Model);
};

function defineServices(Model) {
  Model.GetProvinces = function(cb) {
    Model.find({
      order: 'province ASC, city ASC'
    }, function(err, data) {
      if (err) return cb(err);
      data = _.map(_.uniqBy(data, 'city'));
      data = _.groupBy(data, function(entity) {
        return entity.province;
      });
      cb(null, data);
    });
  };

  Model.remoteMethod("GetProvinces", {
    returns: {
      arg: 'provinces',
      type: 'object',
      root: true
    },
    http: { verb: 'get', path: "/" }
  });
}
