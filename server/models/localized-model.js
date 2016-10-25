//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
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
