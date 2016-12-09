//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var nodePath = require('path');
var app = serverRequire('server');
var underscore = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var debugOne = require('debug')('narengi:image-container:one-upload');
var debugMultiple = require('debug')('narengi:image-container:multiple-upload');
var Http = require('narengi-utils').Http;
var FileSystem = require('narengi-utils').FileSystem;
var Common = require('narengi-utils').Common;

/**
 * This model (`ImageContainerBase`) is responsible for managing images of `House`
 * All remote methods should be served through `House`
 * @class
 * @param  {Model} ImageContainerBase
 */
module.exports = function(ImageContainerBase) {

    addMethods(ImageContainerBase);
    addServices(ImageContainerBase);
};

/**
 * Add static methods for `ImageContainerBase`
 * @param {Model} ImageContainerBase
 */
function addMethods(ImageContainerBase) {

    /**
     * Returns folder name of pictures
     * @return {string}
     */
    ImageContainerBase.DirName = function(config) {
        return config.Dir;
    };

    ImageContainerBase.NotFound = function(httpCtx) {
        httpCtx.res.statusCode = 404;
        httpCtx.res.end();
    };
}


/**
 * Add services to be used in model
 * @param {Model} ImageContainerBase
 */
function addServices(ImageContainerBase) {

    /**
     * Upload one picture attached to http request body
     * @param {HttpContext} httpCtx
     * @param {Object} options
     * @param {Config} config
     * @return {Promise}
     * @constructor
     */
    ImageContainerBase.UploadPicture = function(httpCtx, options, config) {

        options["maxSize"] = config.MaxSize;
        options["hash"] = true;
        options["styles"] = underscore.extend({ original: "original" }, config.Styles);

        console.log('UploadPicture-options', options);
        console.log('UploadPicture-configs', config);

        return new Promise(function(resolve, reject) {
            Http.Uploader.upload(httpCtx.req, options).then(function(file) {
                doStructureResultForOneUpload(file).then((result) => {
                    debugOne(JSON.stringify(result));
                    var hashes = underscore.map(result.db, function(item) {
                        return item.hash;
                    });
                    syncDbFromFs(options["destDir"], options["styles"], hashes, function(err, syncedResult) {
                        if (err) syncedResult = [];
                        result.db = result.db || [];
                        result.db = result.db.concat(syncedResult);
                        resolve(result);
                    });
                }).catch((err) => {
                    reject(err);
                });
            }).catch(function(err) {
                debugOne(err);
                reject(err);
            });
        });
    };

    ImageContainerBase.UploadPicture2 = function(httpCtx, options, config) {

        config = Boolean(Object.keys(config).length) ? config : app.settings.userProfile.picture;

        options["destDir"] = `${__dirname}/../../${config.root}/${config.dirName}/${options.uid}`;
        options["fieldName"] = config.fieldName;
        options["maxSize"] = config.maxSize;
        options["hash"] = true;
        options["styles"] = underscore.extend({ original: "original" }, config.styles);

        return new Promise(function(resolve, reject) {
            Http.Uploader.upload2(httpCtx.req, options)
                .then(function(file) {
                    resolve(file);
                }).catch(function(err) {
                    debugOne(err);
                    reject(err);
                });
        });
    };

    /**
     * Uploads multiple files with specific attributes like filename and destination path and remote field name
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @param {Object} config
     * @return {Promise}
     */
    ImageContainerBase.UploadPictureAll = function(httpCtx, options, config) {

        options["maxSize"] = config.MaxSize;
        options["hash"] = true;
        options["styles"] = underscore.extend({ original: "original" }, config.Styles);

        return new Promise(function(resolve, reject) {

            Http.Uploader.uploadAll(httpCtx.req, options).then(function(files) {
                doStructureResultForMultiple(files).then((result) => {
                    debugMultiple(JSON.stringify(result));
                    var hashes = underscore.map(result.db, function(item) {
                        return item.hash;
                    });
                    syncDbFromFs(options["destDir"], options["styles"], hashes, function(err, syncedResult) {
                        if (err) syncedResult = [];
                        result.db = result.db || [];
                        result.db = result.db.concat(syncedResult);
                        resolve(result);
                    });
                }).catch((err) => {
                    reject(err);
                });
            }).catch(function(err) {
                debugMultiple(err);
                reject(err);
            });
        });
    };

    /**
     * Streaming picture through http
     * @param {String} root Absolute path to root
     * @param {Array} persistedPics Persisted pictures in db
     * @param {String} hash
     * @param {String} style
     * @param {HttpContext} httpCtx
     * @param {Object} config
     */
    ImageContainerBase.DownloadPicture = function(root, persistedPics, hash, style, httpCtx, config) {
        if (!persistedPics) return this.NotFound(httpCtx);

        // console.log('persistedPics', persistedPics); return;

        var picture = underscore.find(persistedPics, function(item) {
            return item.hash === hash;
        });

        if (!picture) return this.NotFound(httpCtx);

        style = underscore.pick(config.Styles, style);
        if (underscore.keys.length < 1)
            style = underscore.extend({ original: "original" }, style);
        style = underscore.keys(style)[0];


        var dir = nodePath.join(root, hash);
        var self = this;

        var originalFilename = "";
        async.waterfall([
            async.apply(fs.readdir, dir),
            function(filenames, callback) {
                var foundFile = underscore.find(filenames, function(filename) {
                    var extname = nodePath.extname(filename);
                    var basename = nodePath.basename(filename, extname);
                    if (basename == "original") {
                        originalFilename = basename + extname;
                    }
                    return basename == style;
                });
                callback(null, foundFile);
            }
        ], function(err, result) {
            if (err) return self.NotFound(httpCtx);
            result = result || originalFilename;
            var filePath = nodePath.join(dir, result);
            download(filePath);
        });

        function download(filePath) {

            Http.Downloader.download(httpCtx.res, "picture", filePath);
        }
    };
}

function syncDbFromFs(root, styles, calculatedHashes, cb) {
    if (!calculatedHashes) {
        calculatedHashes = [];
    }
    cb = cb || Common.PromiseCallback();

    async.waterfall([
        async.apply(fs.readdir, root),
        traverseHashes
    ], function(err, result) {
        if (err) return cb(err);
        cb(null, result);
    });
    return cb.promise;

    /**
     *
     * @param {Array} hashes Hash names indicating one image (but contains multiple styles)
     * @param {Callback} callback Returns hash packets each containing hash and styles array.
     * Like :
     * ```
     * [
     *  {
     *      hash: "hash",
     *      styles: [
     *          style: {key: value},
     *          size: {number},
     *          type: {string}
     *      ]
     *  }, ...
     * ]
     * ```
     */
    function traverseHashes(hashes, callback) {
        async.reduce(hashes, [], traverseEachHash, callback);
    }

    /**
     *
     * @param {Array} hashPackets
     * @param {String} hash
     * @param {Callback} retCb
     */
    function traverseEachHash(hashPackets, hash, retCb) {
        if (underscore.contains(calculatedHashes, hash)) return retCb(null, hashPackets); //prevent from redundant processing

        var oneImgDir = path.join(root, hash);
        async.waterfall([
            async.apply(fs.readdir, oneImgDir),
            function(filenames, callback) {
                async.reduce(filenames, [], calcEachFile, callback);
            }
        ], function(err, result) {
            if (err) return retCb(err);
            var ret = {
                hash: hash,
                styles: result
            };
            hashPackets.push(ret);
            retCb(null, hashPackets);
        });

        /**
         * It processes one style packet for input filename, then concatenates  with reduced memo
         * @param {Array} reducedStyle
         * @param {String} filename
         * @param {Callback} callback
         */
        function calcEachFile(reducedStyle, filename, callback) {
            var styleName = path.basename(filename, path.extname(filename));
            if (!styles[styleName]) return callback(null, reducedStyle);

            var filePath = path.join(oneImgDir, filename);
            var packet = {};
            packet.style = styles[styleName];
            packet.type = mime.lookup(filePath);
            FileSystem.Core.getSize(filePath, function(err, fileSize) {
                if (err) fileSize = { size: 0 };
                packet.size = fileSize.size;
                reducedStyle.push(packet);
                callback(null, reducedStyle);
            });
        }

    }
}

/**
 * Refine structure of uploaded files for db and api
 * @param {Array} files
 * ```
 * [
 *  { file-hash : [array of diverse saved file based on each style]
 *  }
 * ]
 * ```
 * @param {Callback} cb
 * @return {Promise}
 */
function doStructureResultForMultiple(files, cb) {
    cb = cb || Common.PromiseCallback();
    if (underscore.isArray(files)) {
        async.each(files, function(filePack, callback) {
            var fileHash = underscore.keys(filePack)[0];
            var fileArr = filePack[fileHash];
            var filePathArr = underscore.map(fileArr, function(file) {
                return file.destPath;
            });
            extractFileSizes(fileArr, filePathArr).then((updatedFiles) => {
                filePack[fileHash] = updatedFiles;
                callback(null);
            }).catch((err) => {
                callback(err);
            });
        }, function(err) {
            if (err) return cb(err);
            cb(null, prepareReturnForMultipleUpload(files));
        });
    } else {
        cb(null, { api: null, db: null });
    }
    return cb.promise;
}

function prepareReturnForMultipleUpload(files) {
    var ret = {
        api: null,
        db: []
    };
    underscore.each(files, function(filePack) {
        var hash = underscore.keys(filePack)[0];
        var oneFileArr = filePack[hash];

        var arr = underscore.map(oneFileArr, function(item) {
            return {
                style: item.style,
                size: item.size,
                type: item.type
            };
        });
        var oneItem = {};
        oneItem.hash = hash;
        oneItem.styles = arr;
        ret.db.push(oneItem);
    });
    ret.api = ret.db;

    return ret;
}


function doStructureResultForOneUpload(files, cb) {
    cb = cb || Common.PromiseCallback();
    if (underscore.isArray(files)) {
        var filePathArr = underscore.map(files, function(file) {
            return file.destPath;
        });
        extractFileSizes(files, filePathArr).then((updatedFiles) => {
            cb(null, prepareReturnForOneUpload(updatedFiles));
        }).catch((err) => {
            cb(err);
        });
    } else {
        cb(null, { api: null, db: [] });
    }
    return cb.promise;
}

/**
 * Enriches file info packages by file sizes.
 * @param {Array} files Array of file info package returned by `Http.Uploader` utility.
 * @param {Array} filePathArr Array of string denoting file path's
 * @param {Callback} cb
 * @return {Promise}
 */
function extractFileSizes(files, filePathArr, cb) {
    cb = cb || Common.PromiseCallback();
    async.map(filePathArr, FileSystem.Core.getSize, function(err, result) {
        if (err) return cb(err);
        underscore.each(files, function(file) {
            var stat = underscore.find(result, function(item) {
                return file.destPath === item.file;
            });
            file.size = stat ? stat.size : 0;
        });
        cb(null, files);
    });
    return cb.promise;
}

function prepareReturnForOneUpload(files) {
    var ret = {
        api: null,
        db: []
    };
    var packet = {};
    packet.hash = files[0].hash;
    var arr = underscore.map(files, function(item) {
        return {
            style: item.style,
            size: item.size,
            type: item.type
        };
    });
    packet.styles = arr;
    ret.db.push(packet);
    ret.api = ret.db;
    return ret;
}
