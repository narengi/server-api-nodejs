require('@risingstack/trace');
require('newrelic');
var loopback = require('loopback');
var boot = require('loopback-boot');
var path = require('path');
var opbeat = require('opbeat').start({
  appId: '783184833c',
  organizationId: '32e61836c5804fd7a63baab8c973fbe8',
  secretToken: '1d6510eb9a491aa1716a0d5ce5ec80608610e2c0'
});

/**
 * Add `global` method for requiring from `root`
 */
global.serverRequire = function (req) {
    var p = path.normalize(__dirname + '/./' + req);
    return require(p);
};

/**
 * monkey patch `JSON.stringify` because `Error` class does not include `message` field
 */
var jsoner = JSON.stringify;
JSON.stringify = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args && args[0] && args[0] instanceof Error) {
        var err = args[0];
        return `{"statusCode:${err.statusCode},"code":"${err.code}","message":"${err.message}"}`;
    }
    return jsoner.apply(this, arguments);
};

var app = module.exports = loopback();

app.start = function () {
    // start the web server
    return app.listen(function () {
        app.emit('started');
        var baseUrl = app.get('url').replace(/\/$/, '');
        console.log('Web server listening at: %s', baseUrl);
        if (app.get('loopback-component-explorer')) {
            var explorerPath = app.get('loopback-component-explorer').mountPath;
            console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
        }
    });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, {
    appRootDir: __dirname
}, function (err) {
    if (err) throw err;

    // start the server if `$ node server.js`
    if (require.main === module)
        app.start();
});