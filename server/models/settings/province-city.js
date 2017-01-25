'use strict';

var _ = require('lodash');
var fs = require('fs');

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

      // var path = `${__dirname}/../../../../cities.txt`;
      // if (!fs.existsSync(path)) {
      //   fs.writeFileSync(path);
      // }
      // _.each(data, (d) => {
      //   console.log(d);
      //   var province = `${d[0].province}`;
      //   _.each(d, (c) => {
      //     fs.appendFileSync(path, `${province}: ${c.city}\n`);
      //   })
      // })

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
