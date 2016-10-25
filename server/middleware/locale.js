//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var app = serverRequire('server');

module.exports = function(options) {

	/**
	 * Set `locale` for current `context` based on `request-header`
	 **/
	return function localeHandler(req, res, next) {
		try {
			var locale = app.settings.locale.default;
			var allowed = app.settings.locale.allowed;
			var inLocale = req.headers.lang;
			inLocale = inLocale && inLocale.toLowerCase();

			var lang = (allowed.indexOf(inLocale) > -1 && inLocale) || locale;
            LoopBackContext.getCurrentContext().get('narengi_context').setLocale(lang);
			app["currentLocale"] = lang;
			app.i18n.setLocale(lang);

		} catch (e) {
            // req.customContext.currentLocale = 'fa';
            LoopBackContext.getCurrentContext().get('narengi_context').setLocale('fa');
			app["currentLocale"] = 'fa';
			app.i18n.setLocale('fa');
		} finally {
			next();
		}
	}
}