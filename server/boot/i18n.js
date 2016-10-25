//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var i18n = require('i18n');
var path = require('path');

module.exports = function (app) {
    var register = {};
    i18n.configure({
        locales: app.settings.locale.allowed,
        defaultLocale: app.settings.locale.default,
        directory: path.join(__dirname, '..', '..', 'common', 'locales'),
        register: register,
        objectNotation: true
    });
    register.setLocale(app.settings.locale.default);

    Object.defineProperty(app, "i18n", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: register
    });
};
