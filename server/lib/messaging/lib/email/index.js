//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = exports;

var TransporterClass = require('./transporter').Transporter;

var instance = null;

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
exports.GetService = function (options) {

    //because of limitation in lib, we should create a singleton
    function createInstance(){
        instance = new TransporterClass(options);
    }

    if(!instance)
        createInstance();
    return instance;
};