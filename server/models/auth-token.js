//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var uid = require('uid2');
var moment = require('moment');
var promiseCallback = require('narengi-utils').Common.PromiseCallback;

var DEFAULT_TOKEN_LEN = 64;

module.exports = function(AuthToken) {

	/**
	 * Anonymous token used in ACL
	 **/
	AuthToken.ANONYMOUS = new AuthToken({
		id: '$anonymous'
	})

	/**
	 * Creates a token as a hashed `string`
	 **/
	AuthToken.createToken = function(cb) {
		cb = cb || promiseCallback();

		uid(DEFAULT_TOKEN_LEN, function(err, guid) {
			if (err) {
				cb(err);
			} else {
				cb(null, guid);
			}
		});
		return cb.promise;
	};

	/**
	 * Checks if input `token` is expired or not.
	 * Because `AuthToken` is not an entity, we can not define `prototype` methods
	 **/
	AuthToken.isExpired = function(token) {
		if (token) {
			return moment(token.updatedAt).add(token.ttl, 'm').isBefore(moment(), 'd');
		}
		return false;
	};
};