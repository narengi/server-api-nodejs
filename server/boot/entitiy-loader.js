//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = function(app) {

	/**
	 * Loads all boot scripts in `entities` folder.
	 **/

	var normalizedPath = require("path").join(__dirname, "entities");

	require("fs").readdirSync(normalizedPath).forEach(function(file) {
		require("./entities/" + file)(app);
	});
}