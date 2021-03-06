//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var bluebird = require('bluebird');
var formidable = require('formidable');
var nodePath = require('path');
var nodeFs = require('fs');
var mime = require('mime');
var fsExtra = require('fs-extra');
var HttpErrors = require('./errors');
var async = require('async');
var lwip = require('lwip');
var underscore = require('underscore');
var Common = require('narengi-utils').Common;
var fs = require('narengi-utils').FileSystem;
var debug = require('debug')('narengi-utils:http:uploader');

module.exports = exports;

/**
 * Uploads file with remote `fieldname` to `destPath`
 * Resolving returned promise contains an object with below scheme :
 * ``` JSON
 * {
 *   name: {file name},
 *   path: {absolute path to the file},
 *   size: {in bytes},
 *   type: {mime type},
 *   mtime: {creation time in UTC}
 * }
 * ```
 * @param {object} req HttpRequest
 * @param {object} options
 * ``` JSON
 * {
 *  destDir: ""  directory to save file
 *  filedname: "",
 *  destFileName: "" filename,
 *  hash: true|false if hashing is true, then filename is unique and no file replace performed
 * }
 * ```
 * @return {Promise}
 */
exports.upload = function(req, options) {

    options.hash = true; //force hashing
    return new Promise(function(resolve, reject) {

        fs.Core.ensurePathExists(options.destDir)
            .then(pathExisted)
            .catch(pathNotExisted);

        function formParsedHandler(err, fields, files) {
            if (err) {
                return reject(err);
            }
        }

        function fileUploadedHandler(fields, files) {
            if (this.openedFiles && this.openedFiles.length) {
                var uploadedFile = this.openedFiles[0];
                console.time('handleImageStyles');
                handleImageStyles(uploadedFile, options)
                    .then(function(result) {
                        console.timeEnd('handleImageStyles');
                        resolve(result);
                    }).catch(function(err) {
                        reject(err);
                    });
            } else {
                reject(HttpErrors.FileUploadFailure());
            }
        }

        function fileDetectedHandler(name, file) {
            try {
                if (!options.fieldName) return; //prevent forcing upload field names
                if (name.toLowerCase() !== options.fieldName.toLowerCase()) {
                    return reject(HttpErrors.FileNotCorrectError());
                }
                //check image size
                if (options.maxSize && file.size > options.maxSize) {
                    return reject(HttpErrors.FileSizeLimitExceeded());
                }
            } catch (ex) {
                return reject(HttpErrors.FileNotCorrectError());
            }
        }

        function pathExisted(path) {
            if (!req) return reject(HttpErrors.FileNotCorrectError());
            var form = new formidable.IncomingForm();
            form.keepExtensions = true;
            if (!!options.hash)
                form.hash = "md5";
            form.parse(req);
            form.on("end", fileUploadedHandler);
            form.on('file', fileDetectedHandler);
        }

        function pathNotExisted(path) {
            reject(fs.Errors.NoAccess());
        }
    });
};

exports.upload2 = function(req, options) {

    options.hash = true; //force hashing

    return new Promise(function(resolve, reject) {
        // check upload path exists
        let baseDir = fsExtra.ensureDirSync(options.destDir) || options.destDir;

        if (!req) return reject(HttpErrors.FileNotCorrectError());
        
        function fileUploadedHandler() {
            if (this.openedFiles) {
                var uploadedFile = this.openedFiles[0];
                console.timeEnd('uploading');
                handleImageStyles(uploadedFile, options);
                let uploaded = underscore.extend({original: 'original'}, options.styles);
                let styles = [];
                Object.keys(uploaded).map(function(key){
                    styles.push({
                        style: key,
                        size: uploadedFile.size,
                        type: uploadedFile.type
                    })
                })
                resolve({
                    hash: uploadedFile.hash,
                    styles: styles
                });
            } else {
                reject(HttpErrors.FileUploadFailure());
            }
        }

        function fileDetectedHandler(name, file) {
            try {
                if (!options.fieldName) return; //prevent forcing upload field names
                if (name.toLowerCase() !== options.fieldName.toLowerCase()) {
                    return reject(HttpErrors.FileNotCorrectError());
                }
                //check image size
                if (options.maxSize && file.size > options.maxSize) {
                    return reject(HttpErrors.FileSizeLimitExceeded());
                }
            } catch (ex) {
                return reject(HttpErrors.FileNotCorrectError());
            }
        }

        var form = new formidable.IncomingForm();
        form.keepExtensions = true;
        if (!!options.hash)
            form.hash = "md5";
        form.parse(req);
        form.on("end", fileUploadedHandler);
        form.on('file', fileDetectedHandler);
    });
};

exports.mediaUpload = function(req, cb) {
    const Form = new formidable.IncomingForm();
    Form.keepExtensions = true;
    Form.encoding = 'utf-8';
    Form.multiples = true;
    Form.parse(req, cb);
}

/**
 * Uploads files with remote `fieldname` to `destPath`
 * Resolving returned promise contains an object with below scheme :
 * ``` JSON
 * [{
 *   name: {file name},
 *   path: {absolute path to the file},
 *   size: {in bytes},
 *   type: {mime type},
 *   mtime: {creation time in UTC}
 * }]
 * ```
 * @param {object} req HttpRequest
 * @param {object} options
 * ``` JSON
 * {
 *  destDir: ""  directory to save file
 *  filedname: "",
 *  destFileName: "" filename
 * }
 * ```
 * @return {Promise}
 */
exports.uploadAll = function(req, options) {

    options.hash = true; //force hashing
    return new Promise(function(resolve, reject) {

        fs.Core.ensurePathExists(options.destDir).then(pathExisted).catch(pathNotExisted);

        function formParsedHandler(err, fields, files) {
            if (err) {
                return reject(err);
            }
        }

        function fileUploadedHandler(fields, files) {

            var retArr = [];

            if (this.openedFiles) {
                async.each(this.openedFiles, function(file, callback) {
                    handleImageStyles(file, options).then((result) => {
                        if (underscore.isArray(result) && result.length > 0) {
                            var ret = {};
                            ret[result[0].hash] = result;
                            retArr.push(ret);
                        }
                        callback(null);
                    }).catch((err) => {
                        callback(err);
                    });
                }, function(err) {
                    if (err) return reject(err);
                    resolve(retArr);
                });
            } else {
                reject(HttpErrors.FileUploadFailure());
            }
        }

        function fileDetectedHandler(name, file) {
            try {
                if (!options.fieldName) return; //prevent forcing upload field names
                if (name.toLowerCase() !== options.fieldName.toLowerCase()) {
                    return reject(HttpErrors.FileNotCorrectError());
                }
            } catch (ex) {
                return reject(HttpErrors.FileNotCorrectError());
            }
        }

        function pathExisted(path) {
            var form = new formidable.IncomingForm();
            form.keepExtensions = true;
            form.hash = "md5";
            form.multiples = true;
            form.parse(req);
            form.on("end", fileUploadedHandler);
            form.on('file', fileDetectedHandler);
        }

        function pathNotExisted(path) {
            reject(fs.Errors.NoAccess());
        }
    });
};

function handleImageStyles(uploadedFile, options, cb) {
    cb = cb || Common.PromiseCallback();
    styles = options.styles || {};
    styles = underscore.extend({ original: "original" }, styles);

    var emptyDir = bluebird.promisify(fsExtra.emptyDir);

    var openImage = bluebird.promisify(lwip.open);

    var readFile = bluebird.promisify(nodeFs.readFile);

    if (uploadedFile) {
        readFile(uploadedFile.path)
            .then(fileDidRead)
            .catch(function(e) {
                cb(fs.Errors.NoAccess());
            });
    } else {
        cb(HttpErrors.FileUploadFailure());
    }
    return cb.promise;

    function doEachFileForStyle(uploadedFile, styleName, styleValue, buffer) {
        // console.log("Image manipulation - style : %s => %s", styleName, styleValue);
        return function(callback) {
            var destDirPath = nodePath.join(options.destDir, uploadedFile.hash);
            emptyDir(destDirPath).then(doOperation).catch((err) => {
                callback(err);
                return null;
            });

            function doOperation() {
                var extension = nodePath.extname(uploadedFile.name).slice(1).toLowerCase();
                if (!extension) {
                    extension = mime.extension(uploadedFile.type);
                }
                var destPath = nodePath.join(destDirPath, styleName) + "." + extension;
                // console.log("destination : %s", destPath);
                if (styleName !== 'original') {
                    openImage(buffer, extension).then((image) => {
                        var batch = image.batch();
                        //if (image.width() > styleValue) //TODO: this is a policy consideration
                        batch.scale(styleValue / image.width());
                        batch.writeFile(destPath, function(err) {
                            if (err) {
                                // console.log("IMAGE SCALLING ERROR:", err)
                                return callback(err);  
                            } 
                            prepareForReturn(destPath);
                        });
                    }).catch((err) => {
                        // console.log("OPENIMAGE ERROR:", err)
                        callback(null, null);
                    });
                } else {
                    fs.Core.copy(uploadedFile.path, destPath, {}).then(() => {
                        prepareForReturn(destPath);
                    }).catch((err) => {
                        callback(err);
                    });
                }
                return null;
            }

            function prepareForReturn(destPath) {
                var ret = {
                    destDirPath: destDirPath,
                    destPath: destPath,
                    hash: uploadedFile.hash,
                    type: uploadedFile.type,
                    style: {}
                };
                ret.style[styleName] = styleValue;
                // console.log("prepareForReturn", ret);
                callback(null, ret);
                return null;
            }

            return null;
        }
    }

    function fileDidRead(buffer) {
        var cbArr = underscore.map(styles, function(value, key) {
            return new doEachFileForStyle(uploadedFile, key.toString(), value, buffer);
        });

        async.parallel(cbArr, function(err, result) {
            if (err) return cb(err);
            result = underscore.filter(result, function(item) {
                return item !== null;
            });
            cb(null, result);
        });
        return null;
    }
}
