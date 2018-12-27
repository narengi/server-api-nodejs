//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = function(app) {

	/**
	 * Changing specific settings for `RoleMapping` model
	 **/

	// Replace `User` by `Account`
	app.models.RoleMapping.ACCOUNT = "Account";
	app.models.RoleMapping.USER = "Account";
};