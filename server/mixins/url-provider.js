//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var app = serverRequire('server');

var baseUrl = null;

module.exports = function (Model, options) {

    Model.getBaseApiUrl = function () {
        if(baseUrl === null){
            baseUrl = (app.get('https') ? 'https://' : 'http://') + app.get('hostExt');
        }
        return baseUrl;
    };

    Model.formatRelUrl = function(relative){
        return `${this.getBaseApiUrl()}${app.get('restApiRoot')}${relative}`;
    };

    Model.prototype.getDetailUrl = function(){
        var url = `${Model.settings.http.path}/${this.id}`;
        return Model.formatRelUrl(url);
    };
};