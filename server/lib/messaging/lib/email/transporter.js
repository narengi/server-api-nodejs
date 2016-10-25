"use strict";
//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = exports;

var nodemailer = require('nodemailer');
var nodemailerHandlebar = require('nodemailer-express-handlebars');
var debug = require('debug')('narengi-messaging:email');
var underscore = require('underscore');
var PromiseCallback = require('narengi-messaging').PromiseCallback;

class Transporter {

    /**
     *
     * @options {Object} [options] Required
     *
     * @options {Object} [smtp] Required
     * @property {String} host Host name
     * @property {Integer} port
     * @property {Boolean} secure
     * @property {Boolean} pool
     *
     * @options {Object} [auth]
     * @property {String} user Username/Account
     * @property {String} pass Password
     *
     * @options {Object} engine
     * @options {Object} viewEngine Settings for handlebars view engine
     * <br/>See [Configuration](https://github.com/ericf/express-handlebars#configuration-and-defaults)
     * @property {String} extName Extension name of layout files
     * @property {String} layoutsDir
     * @property {String} defaultLayout
     * @property {String} partialsDir
     *
     * @property {String} viewPath
     * @property {String} extName
     *
     * @constructor
     * @public
     */
    constructor(options) {
        this.service = nodemailer.createTransport(options.smtp);
        this.service.use('compile', nodemailerHandlebar(options.engine));
        this.service.use('compile', function (mail, callback) {
            if (!mail.text && mail.html) {
                mail.text = mail.html.replace(/<[^>]*>/g, ' ');
            }
            callback();
        });
    }

    /**
     * Send email to one receiver
     * @param {String} from
     * @param {String} to
     * @param {String} subject
     * @param {String} template
     * @param {Object} context Used to compile template in handlebars
     * @param {Object} options Extra options for sending email
     * @param {Function} cb
     * @method
     * @public
     */
    sendOne(from, to, subject, template, context, options, cb) {
        if (underscore.isFunction(options)) {
            cb = options;
            options = {};
        }

        options = options || {};

        cb = cb || PromiseCallback();

        let packet = options;
        if (from) {
            packet.from = from;
        }
        if (to) {
            packet.to = to;
        }
        if (subject) {
            packet.subject = subject;
        }
        if (template) {
            packet.template = template;
        }
        if (context) {
            packet.context = context;
        }

        debug("Sending email : %j", packet);

        this.service.sendMail(packet, cb);
        return cb.promise;
    }
}

exports.Transporter = Transporter;