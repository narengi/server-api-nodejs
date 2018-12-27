"use strict";
//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

module.exports = exports;

var debug = require('debug')('narengi-messaging:sms:kavenegar');
var underscore = require('underscore');
var request = require('request');
var Errors = require('narengi-messaging').SMS.Errors;
var PromiseCallback = require('narengi-messaging').PromiseCallback;
var SendOneResult = require('narengi-messaging').SMS.Results.SendOne;

var defaults = {
    baseUrl: '',
    apikey: '',
    protocol: 'http',
    sender: null
};

exports.Service = class {

    /**
     *
     * @param {Object} options Settings
     * @constructor
     * @public
     */
    constructor(options) {
        options = options || {};
        if (!options.apikey || !options.baseUrl) {
            debug('Kavenegar system settings is wrong');
            throw new Errors.SystemDefinitionWrong();
        }
        options = underscore.defaults(options, defaults);
        let baseUrl = `${options.protocol}://${options.baseUrl}/${options.apikey}`;
        this.request = request.defaults({
            baseUrl: baseUrl
        });
        this.options = options;
    }

    /**
     * @inheritDoc
     * @param {Object} packet
     * ```
     * {
     * receiver: 'string. receiver number',
     * message: 'string. Encoded',
     * sender: 'string (optional). sender number',
     * date: 'string (optional). unix date',
     * type: 'integer (optional). '
     * }
     * ```
     * See @{link http://kavenegar.com/rest.html#result-msgmode|Send message types}
     *
     * @callback {Function}cb Callback function
     * @param {SMS.Errors.General} err
     * @param {SMS.Kavenegar.Result.SendOne} result
     * ```
     * function(err, result){
     *
     * }
     * ```
     * @return {Promise}
     */
    sendOne(sender, receiver, message, options, cb) {
        cb = cb || PromiseCallback();
        let body = {
            receptor: receiver,
            message: message
        };
        if (options.sender) {
            body.sender = options.sender;
        }
        if (sender) {
            body.sender = sender;
        }
        if (options.date) {
            body.date = options.date;
        }
        if (options.type) {
            body.type = options.type;
        }

        debug('Sending sms from %s to %s', body.sender, body.receptor);

        this.request.post({
            url: '/sms/send.json',
            formData: body
        }, function (error, response, resBody) {
            if (error) {
                debug('error in sending request : %j', error);
                return cb(Errors.ParseInfrastructureError(error));
            }

            resBody = JSON.parse(resBody);

            let result = {};
            if (resBody) {
                if (resBody.return) {
                    result.isSuccessful = resBody.return.status == 200;
                }
                if (underscore.isArray(resBody.entries)) {
                    result.messageId = resBody.entries[0].messageid;
                    result.sendDate = resBody.entries[0].date;
                }
            }
            result.extra = resBody;

            if (result.isSuccessful) {
                return cb(null, new SendOneResult(result));
            }

            var ErrClass = Errors.SendError;
            var errParams = {
                errorKey: 'messaging.sms.kavenegar.402'
            };
            if (resBody) {
                if (resBody.return) {
                    errParams.status = resBody.return.status;
                    errParams.statusText = resBody.return.message;
                }
            }
            if (errParams.status) {
                errParams.errorKey = `messaging.sms.kavenegar.${errParams.status}`;
            }
            cb(new ErrClass(errParams));
        });
        return cb.promise;
    }
};

exports.ErrorDefTranslations = {
    "messaging.sms.kavenegar.400": "Wrong parameters",
    "messaging.sms.kavenegar.401": "Account suspended",
    "messaging.sms.kavenegar.402": "Operation failed",
    "messaging.sms.kavenegar.403": "Wrong ApiKey",
    "messaging.sms.kavenegar.404": "Unknown method",
    "messaging.sms.kavenegar.405": "Wrong method GET/POST",
    "messaging.sms.kavenegar.406": "Required fields are empty",
    "messaging.sms.kavenegar.407": "Access is denied",
    "messaging.sms.kavenegar.409": "Server is unresponsive",
    "messaging.sms.kavenegar.411": "Wrong receiver",
    "messaging.sms.kavenegar.412": "Wrong sender",
    "messaging.sms.kavenegar.413": "Message is empty overloaded",
    "messaging.sms.kavenegar.414": "Request volume is more than threshold",
    "messaging.sms.kavenegar.415": "",
    "messaging.sms.kavenegar.417": "Wrong date",
    "messaging.sms.kavenegar.418": "Charge is not enough",
    "messaging.sms.kavenegar.419": "Array of sender, receiver and messages are not equal",
    "messaging.sms.kavenegar.422": "Bad character in messages",
    "messaging.sms.kavenegar.424": "Pattern not found",
    "messaging.sms.kavenegar.426": "Not enough SLA",
    "messaging.sms.kavenegar.431": "Bad code structure",
    "messaging.sms.kavenegar.432": "Code not found in message"
};