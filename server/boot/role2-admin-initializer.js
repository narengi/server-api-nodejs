//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var randomString = require("randomstring");

module.exports = function(app) {
	/*
	 * Adding necessary admin `Account`s to database.
	 */

	var Account = app.models.Account;
	var Role = app.models.Role;
	var RoleMapping = app.models.RoleMapping;

	var admin = {
		email: "admin@narengi.xyz",
		password: "123456"
	};

	var createAdminHandler = function(account) {
		account.verifications.create({
			verificationType: app.VerificationTypeEnum.get('None'),
			verified: true,
			code: randomString.generate({
				length: app.settings.narengi.verificationCodeLen,
				charset: 'numeric'
			})
		}).then(function() {
			Role.findOne({
				where: {
					name: "ADMIN"
				}
			}).then(function(role) {
				role.principals.create({
					principalType: RoleMapping.ACCOUNT,
					principalId: account.id
				});
			});
		});
	};

	Account.count({
		email: admin.email
	}).then(function(count) {
		if (count < 1) {
			Account.create(admin).then(createAdminHandler);
		}
	});
};