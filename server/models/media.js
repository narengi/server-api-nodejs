'use strict'

const loopback = require('loopback');
const loopBackContext = require('loopback-context');
const app = serverRequire('server');
const configs = app.settings;
const MainHandler = require('../Handlers/Main');
const Http = require('narengi-utils').Http;
const lwip = require('lwip');
const async = require('async');
const crypto = require('crypto');
const fs = require('fs');
const debug = require('debug');
const _ = require('lodash');

class Medias extends MainHandler {

    constructor (Media) {
        super(Media)
            // Register Methods
        this.upload()
        this.get()
        this.set()
        this.unset()
        this.remove()
    }

    upload () {

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
            },
            error: {
                status: 'number',
                code: 'string',
                message: 'string'
            }
        }

        this.registerMethod(Settings, (req, cb) => {

            uploadDebugger(`request params:`, req.params)
            const Storage = app.models.Storage;
            let container = req.params.section.trim();
            let contcfg = _.has(configs, container) ? configs[container].picture : {};
            let ctx = loopBackContext.getCurrentContext();
            let currentUser = ctx && ctx.get('currentUser');
            if (!currentUser) cb({ status: 401, message: 'unauthorized' })

            // VALIDATE CONFIGS
            let Err = null;
            switch (true) {
                case !Object.keys(contcfg).length:
                    uploadDebugger(`validation failed: invalid 'contcfg' object keys length for ${container}`)
                    Err = this.Error(400, 'validation failed', `invalid section '${container}'`)
                    break;
                case !_.has(contcfg, 'dirName') || !contcfg.dirName.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'dirName'`)
                    Err = this.Error(400, 'validation failed', `invalid configuration for '${container}'`);
                    break;
                case !_.has(contcfg, 'maxSize') || typeof contcfg.maxSize !== "number":
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'maxSize'`)
                    Err = this.Error(400, 'validation failed', `invalid configuration for '${container}'`)
                    break;
                case !_.has(contcfg, 'key') || !contcfg.key.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'key'`)
                    Err = this.Error(400, 'validation failed', `invalid configuration for '${container}'`)
                    break;
                case !_.has(contcfg, 'model') || !contcfg.model.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'model'`)
                    Err = this.Error(400, 'validation failed', `invalid configuration for '${container}'`)
                    break;
            }

            if (Err) cb(Err);

            async.waterfall([
                (callback) => {
                    // CHECK IF CONTAINER IS EXISTS
                    Storage.getContainer(contcfg.dirName, (err) => callback(null, err ? err.code : 'OK'))
                },
                (cont, callback) => {
                    // CREATE CONTAINER IF IT IS NOT EXISTS
                    switch (cont) {
                        case 'OK':
                            callback(null)
                        case 'ENOENT':
                            Storage.createContainer({ name: contcfg.dirName }, () => callback(null))
                            break;
                    }
                },
                (callback) => {
                    // GET FILE FROM REQUEST
                    Http.Uploader.mediaUpload(req)
                        .then((file) => callback(null, file))
                        .catch((err) => callback(err))
                },
                (file, callback) => {
                    // VALIDATE FILE BASE ON CONTAINER CONFIGS
                    let isValid = true;
                    let Err = null;

                    isValid = isValid && file.type.substring(0, file.type.indexOf('/')) === "image";
                    if (!isValid && !Err) {
                        Err = this.Error(400,
                            'validation failed',
                            `invalid uploaded file type '${file.type.substring(0, file.type.indexOf('/'))}'`);
                    }

                    isValid = isValid && Number(file.size) <= contcfg.maxSize;
                    if (!isValid && !Err) {
                        Err = this.Error(400,
                            'validation failed',
                            'maximum uploaded file size exceeds')
                    }

                    callback(!isValid ? Err : null, isValid ? file : null);
                },
                (file, callback) => {
                    // CREATE IMAGE OBJECT FROM FILE
                    lwip.open(file.path, (err, img) => {
                        if (!err)
                            callback(null, {
                                hash: crypto.createHmac('md5', `${contcfg.key}=${currentUser.id}`).update(file.path).digest('hex'),
                                size: file.size,
                                type: file.type,
                                ext: file.type.substr(file.type.indexOf('/') + 1),
                                owner_id: currentUser.id,
                                assign_type: container,
                                storage: contcfg.dirName
                            }, img)
                        else
                            callback(err)
                    })
                },
                (file, img, callback) => {
                    // WRITE FILE
                    img.writeFile(`./storage/${contcfg.dirName}/${file.hash}`, file.ext, {}, () => {
                        // SAVE FILE
                        this.Model.create(file)
                            .then((media) => callback(null, media.uid))
                            .catch((err) => callback(err))
                    });
                }
            ], (err, result) => {
                // DONE
                if (!err)
                    cb(null, {
                        uid: result,
                        message: 'image uploaded'
                    })
                else
                    cb(err)
            });

            return cb.promise
        })
    }

    get () {

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

    set () {

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
                        .then((media) => callback(media ? null : { status: 404, message: 'not found'}, media))
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

    unset () {

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

    remove () {

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
