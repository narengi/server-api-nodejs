//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = function() {
	var cb;

	var promise = new Promise(function(resolve, reject) {
		cb = function(err, data) {
			if (err) return reject(err);
			return resolve(data);
		};
	});
	cb.promise = promise;
	return cb;
};