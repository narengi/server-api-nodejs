//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = exports;

exports.QueryParams = function (ctx) {
    var req = ctx.req;
    var query = req.query;
    return query || {};
};