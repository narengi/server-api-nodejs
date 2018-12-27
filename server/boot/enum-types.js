//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var NotificationConstants = require('../../common/constants/notification-constants');

module.exports = function(app) {

	/**
	 * Registers all enum types needed in system.
	 **/

	//Register `enum` as known types in `node`
	require('enum').register();

	// Defining `RegistrationSourceEnum`
	var regSource = new Enum({
		'Mobile': 'Mobile',
		'Web': 'Web'
	}, {
		name: "RegistrationSource",
		ignoreCase: true,
		freez: true
	});
	Object.defineProperty(app, "RegistrationSourceEnum", {
		get: function() {
			return regSource;
		}
	}, {
		enumerable: true
	});

    //===================================================================================

	//Defining `VerificationTypeEnum`
	var verificationType = new Enum({
		'None': 'None',
		'Email': 'Email',
		'SMS': 'SMS'
	}, {
		name: "VerificationTypeEnum",
		ignoreCase: true,
		freez: true,
		separator: ' | '
	});
	Object.defineProperty(app, "VerificationTypeEnum", {
		get: function() {
			return verificationType;
		}
	}, {
		enumerable: true
	});

    //===================================================================================
    app.NotificationSettings = {};

    Object.defineProperty(app.NotificationSettings, "NoteType", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: NotificationConstants.NoteTypes
    });

    //=======================================================================================

    Object.defineProperty(app.NotificationSettings, "EmailType", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: NotificationConstants.EmailType
    });

    //=======================================================================================

    Object.defineProperty(app.NotificationSettings, "SmsType", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: NotificationConstants.SmsType
    });

    //===================================================================================

    //Defining `VerificationTypeEnum`
    var houseBookingRequestStateEnum = new Enum({
        'None': 'None',
        'Email': 'Email',
        'SMS': 'SMS'
    }, {
        name: "VerificationTypeEnum",
        ignoreCase: true,
        freez: true,
        separator: ' | '
    });
    /*Object.defineProperty(app, "VerificationTypeEnum", {
        get: function() {
            return verificationType;
        }
    }, {
        enumerable: true
    });*/
};