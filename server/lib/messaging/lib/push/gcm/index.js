"use strict";
//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Sender = require('node-sender')();
var underscore = require('underscore');
var debug = require('debug')('narengi-messaging:push:gcm');
var Errors = require('narengi-messaging').Push.Errors;

module.exports = exports;

class Service {

    /**
     * @constructor
     * @param {Object} options
     * @options [options]
     * @property {String} Required apiKey Google GCM API key
     */
    constructor(options) {
        let config = {
            apiKey: options.apiKey
        };
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
     * @property {Object} extra Extra key value
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
            body: message
        };
        if (options.title)
            packet.title = options.title;
        if (options.extra) {
            packet = underscore.extend(packet, options.extra);
        }
        packet.title = packet.title || "";

        debug('Sending push : %j', packet);
        
        Sender.send({
            type: Sender.constants.TYPE_ANDROID,
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