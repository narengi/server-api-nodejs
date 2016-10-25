"use strict";
//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Sender = require('node-sender')();
var underscore = require('underscore');
var debug = require('debug')('narengi-messaging:push:apn');
var Errors = require('narengi-messaging').Push.Errors;

module.exports = exports;

class Service {

    /**
     * @constructor
     * @param {Object} options
     * @options [options]
     * @property {String} Required cert Absolute path to cert file
     * @property {String} Required key Absolute path to key file
     * @property: {Boolean} Optional production 
     */
    constructor(options) {
        let config = {
            cert: options.certFile,
            key: options.keyFile
        };
        config.production = options.production === true;
        this.config = config;
    }

    /**
     * Send push notification to destination devices
     * @param {Array|String} destTokens Destination device token(s)
     * @param {string} message
     * @param {Object} options Specific destination system settings
     * @options [options]
     * @property {String} title
     * @property {Integer} ttl In seconds. Default : `3600`
     * @property {Integer} badge Badge number
     * @property {String} sound
     *
     * @param {Function} cb Containing promise
     * @method
     * @public
     */
    push(destTokens, message, options, cb) {
        let tokens = [];
        tokens.push(destTokens);
        tokens = underscore.flatten(tokens);

        let config = this.config;
        if (options.ttl)
            config.ttl = options.ttl;

        let packet = {
            alert: message
        };
        if (options.badge)
            packet.badge = options.badge;
        if (options.sound)
            packet.sound = options.sound;

        debug('Sending push : %j', packet);

        Sender.send({
            type: Sender.constants.TYPE_IOS,
            message: packet,
            tokens: tokens,
            config: config
        }, function (error, result) {
            if (error) return cb(error);
            if (result.successful) return cb(null, result);
            if (result.unregistered) {
                return cb(new Errors.UnregisteredTokenError({
                    extra: result
                }));
            }
            return cb(new Errors.General({
                extra: result
            }));
        });
        return cb.promise;
    }
}

exports.Service = Service;