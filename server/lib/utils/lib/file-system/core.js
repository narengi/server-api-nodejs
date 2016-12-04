//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var Common = require('narengi-utils').Common;
var bluebird = require('bluebird');
var fs = require('fs');
var fsAccess = bluebird.promisify(fs.access);
var fsMkdir = bluebird.promisify(require('fs-extra').mkdirs);
var fsCopy = bluebird.promisify(require('fs-extra').copy);
var fsMove = bluebird.promisify(require('fs-extra').move);
var FsErrors = require('./errors');

module.exports = exports;


function mkdirPath(path, mode) {
    return fsMkdir(path, mode);
}

/**
 * Check if path exists. If not then creates it.
 * @param  {string}  path
 * @param options
 * @public
 * @namespace FileSystem.Core
 */
exports.ensurePathExists = function (path, options) {
    var mode = "0777";
    if (!options) {
        options = {};
    }
    if (options.mode) {
        mode = options.mode;
    }

    return new Promise(function (resolve, reject) {
        function handleAccess(err) {
            if (err) {
                console.log("handleAccess-1", err);
                if (err.path) {
                    mkdirPath(err.path, mode).then(() => {
                        resolve(err.path);
                    }).catch((err2) => {
                        console.log("handleAccess-2", err2);
                        reject(FsErrors.NoAccess(err.path));
                    });
                }
            } else {
                resolve(path);
            }
        };
        fsAccess(path, fs.F_OK).then(handleAccess).catch(handleAccess);
    });
};

/**
 * Copies file or directory from source to destination
 * Proxies `fs-extra` module , `copy` function
 * @param {string} src
 * @param {string} dest
 * @param {object} options
 * @returns {Promise}
 * @public
 * @namespace FileSystem.Core
 */
exports.copy = function (src, dest, options) {
    options = options || {};
    return fsCopy(src, dest, options);
};

/**
 * Moves file or directory from source to destination
 * Proxies `fs-extra` module , `move` function
 * @param {string} src
 * @param {string} dest
 * @param {object} options
 * @returns {Promise}
 * @public
 * @namespace FileSystem.Core
 */
exports.move = function (src, dest, options) {
    options = options || {};
    options["clobber"] = true;
    return fsMove(src, dest, options);
};

/**
 * Get size of input file
 * @param {String} filePath Absolute file path
 * @param {Function} cb Callback
 * @return {Promise} Resolving an object containing `file` and `size`
 * @public
 * @namespace FileSystem.Core
 */
exports.getSize = function (filePath, cb) {
    cb = cb || Common.PromiseCallback();
    var fstat = bluebird.promisify(fs.stat);

    fstat(filePath).then((stat) => {
        if (!stat) return cb(new Error());
        cb(null, {
            file: filePath,
            size: stat.size
        });
    }).catch((err) => {cb(err);});
    return cb.promise;
};