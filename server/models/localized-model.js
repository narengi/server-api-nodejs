//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var app = serverRequire('server');

module.exports = function (LocalizedModel) {
    LocalizedModel.injectLangToFilter = function (filter) {
        filter = filter || {};
        filter.where = filter.where || {};
        if(!filter.where.lang){
            filter.where['lang'] = app.currentLocale;
        }
    };
};
