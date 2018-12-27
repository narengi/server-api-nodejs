//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = function(app) {

	/**
	 * Changing specific settings for `User` model
	 **/

	app.models.User.disableRemoteMethod("login", true);
	app.models.User.disableRemoteMethod("logout", true);
};