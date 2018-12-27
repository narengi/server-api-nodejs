"use strict";
//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var underscore = require('underscore');
var PromiseCallback = require('narengi-messaging').PromiseCallback;

module.exports = exports;

class Service {

    /**
     *
     * @param {Object} service
     * @param {String} type Push notification system type gsm|apn
     */
    constructor(service, type) {
        this.service = service;
        this.type = type;
    }

    /**
     * Send push notification to destination devices
     * @param {Array|String} destTokens Destination device token(s)
     * @param {string} message
     * @param {Object} options Specific destination system settings
     * @param {Function} cb
     * @method
     * @public
     */
    push(destTokens, message, options, cb) {
        if (underscore.isFunction(options)) {
            cb = options;
            options = {};
        }
        options = options || {};
        cb = cb || PromiseCallback();
        this.service.push(destTokens, message, options, cb);
    }
}

exports.Service = Service;