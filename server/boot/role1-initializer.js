//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = function(app) {
	/*
	 * Adding necessary `Role`s to database.
	 * `Guest` and `Host` are dynamic roles and should not be added to database.
	 */

	var initRoles = [{
		name: "ADMIN",
		description: "Administrator role"
  }];

	var Role = app.models.Role;
	Role.findOrCreate({
		name: {
			like: ""
		}
	}, initRoles, function(err, roles) {});

	Role.ADMIN = "ADMIN";
};