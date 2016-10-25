var loopback = require('loopback');
var boot = require('loopback-boot');
var path = require('path');

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