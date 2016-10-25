//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = exports;

exports.HttpPagingParam = function (ctx) {
    var req = ctx.req;
    var query = req.query;
    var ret = {limit: 0, skip: 0};
    if (!query || !query.filter) {
        return ret;
    }

    var filter = query.filter;
    if (filter.limit) {
        ret.limit = parseInt(filter.limit);
    }
    if (filter.skip) {
        ret.skip = parseInt(filter.skip);
    }
    return ret;
};
