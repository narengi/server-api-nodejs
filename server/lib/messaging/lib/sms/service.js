"use strict";
//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = exports;

var NotImplemented = require('./errors').NotImplemented;
var underscore = require('underscore');

/**
 * It's a proxy
 * @class
 */
class Service {

    /**
     * @param {Object} service
     * @param {String} type Vendor type
     */
    constructor(service, type) {
        this.service = service;
        this.type = type;
    }

    /**
     * Send sms to one receiver
     * @param {String} sender
     * @param {String} receiver
     * @param {String} message
     * @param {Object} options vendor specific options
     * @param {Function} cb
     * @method
     * @public
     * @abstract
     */
    sendOne(sender, receiver, message, options, cb) {
        if (underscore.isFunction(options)) {
            cb = options;
            options = {};
        }
        options = options || {};
        try {
            this._isReady();
        }
        catch (e) {
            if (underscore.isFunction(cb))
                return cb(e);
            return;
        }
        return this.service.sendOne(sender, receiver, message, options, cb);
    }

    /**
     * Check if this is able to serve services
     * @private
     */
    _isReady() {
        if (!this.service)
            throw new NotImplemented({
                extra: {
                    type: this.type
                }
            });
    }
}

exports.Service = Service;