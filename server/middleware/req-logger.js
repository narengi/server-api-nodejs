'use strict';

module.exports = function () {
	return function (req, res, next) {
		console.log(`
			${new Date()} 
			[${req.method.toUpperCase()}] ${req.protocol}://${req.headers.host}${req.url} (${res.statusCode})
			authorization: ${req.headers.authorization}
		`);
		next();
	}
}