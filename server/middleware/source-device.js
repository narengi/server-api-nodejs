//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var loopback = require('loopback');
var LoopBackContext = require('loopback-context');
var app = require('../server');

module.exports = function(options) {

	/**
	 * Find out `request` source, `Web` or `Mobile`
	 **/
	return function handler(req, res, next) {
		try {
			var RegistrationSourceEnum = app.RegistrationSourceEnum;
			var defSource = RegistrationSourceEnum.Web;

			if (req.headers.src) {
				var src = req.headers.src;
				RegistrationSourceEnum.enums.forEach(function(item) {
					if (item.is(src)) {
						defSource = item;
					}
				});
			}
            LoopBackContext.getCurrentContext().get('narengi_context').setReqSource(defSource);

		} catch (e) {

		} finally {
			next();
		}
	}
}