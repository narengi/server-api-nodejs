//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = exports;

exports.QueryParams = function (ctx) {
    var req = ctx.req;
    var query = req.query;
    return query || {};
};