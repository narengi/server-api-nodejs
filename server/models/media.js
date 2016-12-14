'use strict'

const loopBackContext = require('loopback-context'),
    app = serverRequire('server'),
    configs = app.settings,
    MainHandler = require('../Handlers/Main'),
    Http = require('narengi-utils').Http,
    lwip = require('lwip'),
    async = require('async'),
    crypto = require('crypto'),
    fs = require('fs'),
    debug = require('debug'),
    _ = require('lodash');

class Medias extends MainHandler {

    constructor(Media) {
        super(Media)
            // Register Methods
        this.UploadMedia();
        this.GetMedia();
        this.SetMedia();
        this.UnsetMedia();
        this.RemoveMedia();
    }

    UploadMedia() {

        const uploadDebugger = debug('narengi-media:upload')

        let Settings = {
            name: 'UploadMedia',
            description: 'upload new medias',
            path: '/upload/:section',
            method: 'post',
            status: 201,
            accepts: [{
                arg: 'req',
                type: 'object',
                http: {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object'
            }
        }

        this.registerMethod(Settings, (req, cb) => {

            uploadDebugger(`request params:`, req.params)
            const Storage = app.models.Storage;
            let container = req.params.section.trim();
            let contcfg = _.has(configs, container) ? configs[container].picture : {};
            let ctx = loopBackContext.getCurrentContext();
            let currentUser = ctx && ctx.get('currentUser');
            if (!currentUser) this.Error({ status: 401, message: 'unauthorized' }, cb);

            // VALIDATE CONFIGS
            switch (true) {
                case !Object.keys(contcfg).length:
                    uploadDebugger(`validation failed: invalid 'contcfg' object keys length for ${container}`)
                    this.Error({
                        status: 400,
                        code: 'validation failed',
                        message: `invalid section '${container}'`
                    }, cb)
                    break;
                case !_.has(contcfg, 'dirName') || !contcfg.dirName.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'dirName'`)
                    this.Error({
                        status: 400,
                        code: 'validation failed',
                        message: `invalid configuration for '${container}'`
                    }, cb)
                    break;
                case !_.has(contcfg, 'maxSize') || typeof contcfg.maxSize !== "number":
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'maxSize'`)
                    this.Error({
                        status: 400,
                        code: 'validation failed',
                        message: `invalid configuration for '${container}'`
                    }, cb)
                    break;
                case !_.has(contcfg, 'key') || !contcfg.key.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'key'`)
                    this.Error({
                        status: 400,
                        code: 'validation failed',
                        message: `invalid configuration for '${container}'`
                    }, cb)
                    break;
                case !_.has(contcfg, 'model') || !contcfg.model.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'model'`)
                    this.Error({
                        status: 400,
                        code: 'validation failed',
                        message: `invalid configuration for '${container}'`
                    }, cb)
                    break;
            }

            async.waterfall([
                (callback) => {
                    // CHECK IF CONTAINER IS EXISTS
                    uploadDebugger('CHECK IF CONTAINER IS EXISTS');
                    Storage.getContainer(contcfg.dirName, (err) => callback(null, err ? err.code : 'OK'))
                },
                (cont, callback) => {
                    // CREATE CONTAINER IF IT IS NOT EXISTS
                    uploadDebugger('CREATE CONTAINER IF IT IS NOT EXISTS');
                    switch (cont) {
                        case 'OK':
                            callback(null)
                            break;
                        case 'ENOENT':
                            Storage.createContainer({ name: contcfg.dirName }, () => callback(null))
                            break;
                    }
                },
                (callback) => {
                    // GET FILE DATA FROM REQUEST
                    uploadDebugger('GET FILE DATA FROM REQUEST');
                    Http.Uploader.mediaUpload(req, callback);
                },
                (fileds, formData, callback) => {
                    // VALIDATE FILE BASE ON CONTAINER CONFIGS
                    uploadDebugger('VALIDATE FILE BASE ON CONTAINER CONFIGS');
                    let isValid = true;
                    let files = [];

                    _.each(formData.files, (file, idx) => {
                        isValid = isValid && file.type.substring(0, file.type.indexOf('/')) === "image";
                        uploadDebugger(`check file type: ${file.type.substring(0, file.type.indexOf('/'))} = ${isValid}`)
                        if (!isValid) {
                            uploadDebugger(`invalid uploaded file type '${file.type.substring(0, file.type.indexOf('/'))}'`)
                            this.Error({
                                status: 400,
                                code: 'validation failed',
                                message: `invalid uploaded file type '${file.type.substring(0, file.type.indexOf('/'))}'`
                            }, cb);
                        }

                        isValid = isValid && Number(file.size) <= contcfg.maxSize;
                        uploadDebugger(`check file size: ${Number(file.size)}/${contcfg.maxSize} = ${isValid}`)
                        if (!isValid) {
                            uploadDebugger('maximum uploaded file size exceeds')
                            this.Error({
                                status: 400,
                                code: 'validation failed',
                                message: 'maximum uploaded file size exceeds'
                            }, cb);
                        }

                        files.push({
                            hash: crypto.createHmac('md5', `${contcfg.key}=${currentUser.id}`).update(file.path).digest('hex'),
                            path: file.path,
                            size: file.size,
                            type: file.type,
                            ext: file.type.substr(file.type.indexOf('/') + 1),
                            owner_id: currentUser.id,
                            assign_type: container,
                            storage: contcfg.dirName
                        })
                    });

                    callback(files.length ? null : {
                        status: 400
                    }, files.length ? files : null);
                },
                (files, callback) => {
                    // CREATE IMAGE OBJECTS FROM FILES
            		uploadDebugger('CREATE IMAGE OBJECTS FROM FILES');
                    let idx = 0;
                    _.each(files, (file) => {
                        lwip.open(file.path, (err, img) => {
                            file.img = img;
                            if (idx < files.length - 1) idx++;
                            else callback(null, files);
                        })
                    });
                },
                (files, callback) => {
                    // WRITE FILES
                    let idx = 0;1
                    _.each(files, (file) => {
                        file.img.writeFile(`./storage/${contcfg.dirName}/${file.hash}`, file.ext, {}, () => {
                            if (idx < files.length - 1) idx++;
                            else callback(null, files);
                        });
                    });
                },
                (files, callback) => {
                    // SAVE FILE TO DB
                    uploadDebugger('SAVE FILES TO DB');
                    let uploaded = [];
                    let idx = 0;

                    _.each(files, (file) => {
                    	delete file.img;
	                    this.Model.create(file)
	                        .then((media) => {
	                            uploaded.push(media.id);
	                            if (idx < files.length - 1) idx++;
	                            else callback(null, uploaded);
	                        })
	                        .catch((err) => {
	                            uploadDebugger('SAVE FILE TO DB ERR');
	                            if (idx < files.length - 1) idx++;
	                            else callback(err);
	                        });
                    });
                }
            ], (err, result) => {
                // DONE
                if (!err) {
                    uploadDebugger('DONE')
                    cb(null, {
                        uids: result,
                        message: `${result.length} images uploaded`
                    })
                } else {
                    uploadDebugger('ERR')
                    cb(err)
                }
            });

            return cb.promise
        })
    }

    GetMedia() {

        let Settings = {
            name: 'GetMedia',
            description: 'get medias',
            path: '/get/:uid',
            method: 'get',
            status: 200,
            accepts: [{
                arg: 'req',
                type: 'object',
                http: {
                    source: 'req'
                }
            }, {
                arg: 'res',
                type: 'object',
                http: {
                    source: 'res'
                }
            }],
            returns: {
                arg: 'fileObject',
                type: 'object',
                root: true
            }
        }

        this.registerMethod(Settings, (req, res, cb) => {

            const uid = req.params.uid;
            let ctx = loopBackContext.getCurrentContext();
            let currentUser = ctx && ctx.get('currentUser');

            async.waterfall([
                (callback) => {
                    this.Model.findOne({
                            where: {
                                uid: uid,
                                deleted: false
                            }
                        })
                        .then((media) => callback(media ? null : { status: 404, message: 'not found' }, media))
                        .catch((err) => callback(err))
                }
            ], (err, media) => {
                if (!err) {
                    // check for media privacy
                    if (!media.is_private || currentUser && String(currentUser.id) === String(media.owner_id)) {
                        res.setHeader('Content-type', media.type);
                        let readStream = fs.createReadStream(`./storage/${media.storage}/${media.hash}`);
                        readStream.pipe(res)
                    } else {
                        cb({ status: 403, message: 'access denied' })
                    }
                } else cb(err)
            });

            return cb.promise;
        });
    }

    SetMedia() {

        let Settings = {
            name: 'SetMedia',
            description: 'set medias to specified content',
            path: '/set',
            method: 'put',
            status: 200,
            accepts: [{
                arg: 'data',
                type: 'object',
                http: {
                    source: 'body'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object'
            }
        }

        this.registerMethod(Settings, (data, cb) => {

            const uid = data.uid;
            const cid = data.cid;
            let ctx = loopBackContext.getCurrentContext();
            let currentUser = ctx && ctx.get('currentUser');
            if (!currentUser) cb({ status: 401, message: 'unauthorized' })

            async.waterfall([
                (callback) => {
                    // GET MEDIA
                    this.Model.findOne({
                            where: {
                                uid: uid,
                                owner_id: currentUser.id,
                                deleted: false
                            }
                        })
                        .then((media) => callback(media ? null : { status: 404, message: 'not found' }, media))
                        .catch((err) => callback(err))
                },
                (media, callback) => {
                    // CHECK IF ASSIGNED ID IS FOR CONTENT WITH SAME TYPE
                    if (media.assign_type === 'userprofile') {
                        callback(null, currentUser.id);
                    } else {
                        let contCfg = configs[media.assign_type].picture;
                        app.models[contCfg.model].findOne({
                                where: {
                                    id: cid,
                                    $or: [
                                        { ownerId: currentUser.personId },
                                        { personId: currentUser.personId }
                                    ]
                                }
                            })
                            .then((data) => callback(data ? null : 'not-found', data.id))
                            .catch((err) => callback(err))
                    }
                },
                (assign_id, callback) => {
                    this.Model.update({ uid: uid }, { assign_id: assign_id })
                        .then((result) => callback(null, result))
                        .catch((err) => callback(err))
                }
            ], (err, result) => {
                if (!err)
                    cb(null, {
                        message: result.count ? 'assigned' : 'failed'
                    })
                else
                    cb(err)
            });

            return cb.promise;
        });
    }

    UnsetMedia() {

        let Settings = {
            name: 'UnsetMedia',
            description: 'unset medias from specified content',
            path: '/unset',
            method: 'put',
            status: 200,
            accepts: [{
                arg: 'data',
                type: 'object',
                http: {
                    source: 'body'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object'
            }
        }

        this.registerMethod(Settings, (data, cb) => {

            const uid = data.uid; // media id
            let ctx = loopBackContext.getCurrentContext();
            let currentUser = ctx && ctx.get('currentUser');
            if (!currentUser) cb({ status: 401, message: 'unauthorized' })

            async.waterfall([
                (callback) => {
                    // GET MEDIA
                    this.Model.findOne({
                            where: {
                                uid: uid,
                                owner_id: currentUser.id,
                                deleted: false
                            }
                        })
                        .then((media) => callback(media ? null : { status: 404, message: 'not found' }))
                        .catch((err) => callback(err))
                },
                (callback) => {
                    this.Model.update({ uid: uid }, { assign_id: null })
                        .then((result) => callback(null, result))
                        .catch((err) => callback(err))
                }
            ], (err, result) => {
                if (!err)
                    cb(null, {
                        message: result.count ? 'unassigned' : 'failed'
                    })
                else
                    cb(err)
            });

            return cb.promise;
        });
    }

    RemoveMedia() {

        let Settings = {
            name: 'RemoveMedia',
            description: 'remove medias from specified content',
            path: '/remove/:uid',
            method: 'delete',
            status: 200,
            accepts: [{
                arg: 'req',
                type: 'object',
                http: {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object'
            }
        }

        this.registerMethod(Settings, (req, cb) => {

            const uid = req.params.uid; // media id
            let ctx = loopBackContext.getCurrentContext();
            let currentUser = ctx && ctx.get('currentUser');
            if (!currentUser) cb({ status: 401, message: 'unauthorized' })

            async.waterfall([
                (callback) => {
                    // GET MEDIA
                    this.Model.findOne({
                            where: {
                                uid: uid,
                                owner_id: currentUser.id,
                                deleted: false
                            }
                        })
                        .then((media) => callback(media ? null : { status: 404, message: 'not found' }))
                        .catch((err) => callback(err))
                },
                (callback) => {
                    this.Model.update({ uid: uid }, { deleted: true })
                        .then((result) => callback(null, result))
                        .catch((err) => callback(err))
                }
            ], (err, result) => {
                if (!err)
                    cb(null, {
                        message: result.count ? 'removed' : 'failed'
                    })
                else
                    cb(err)
            });

            return cb.promise;
        });
    }

}

module.exports = (Media) => new Medias(Media);
