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
    }

    upload () {

        const uploadDebugger = debug('narengi-media:upload')

        let Settings = {
            name: 'upload',
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

            // VALIDATE CONFIGS
            let Err = new Error();
            switch (true) {
            	case !Object.keys(contcfg).length:
                    uploadDebugger(`validation failed: invalid 'contcfg' object keys length for ${container}`)
                    Err.status = 400;
                    Err.name = 'validation failed';
                    Err.message = `invalid section '${container}'`;
                    cb(Err);
                break;
            	case !_.has(contcfg, 'dirName') || !contcfg.dirName.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'dirName'`)
                    Err.status = 400;
                    Err.name = 'validation failed';
                    Err.message = `invalid configuration for '${container}'`;
                    cb(Err);
                break;
            	case !_.has(contcfg, 'maxSize') || typeof contcfg.maxSize !== "number":
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'maxSize'`)
                    Err.status = 400;
                    Err.name = 'validation failed';
                    Err.message = `invalid configuration for '${container}'`;
                    cb(Err);
                break;
            	case !_.has(contcfg, 'key') || !contcfg.key.trim().length:
            		uploadDebugger(`validation failed: 'contcfg' not include required key 'key'`)
                    Err.status = 400;
                    Err.name = 'validation failed';
                    Err.message = `invalid configuration for '${container}'`;
                    cb(Err);
            	break;
                case !_.has(contcfg, 'model') || !contcfg.model.trim().length:
                    uploadDebugger(`validation failed: 'contcfg' not include required key 'model'`)
                    Err.status = 400;
                    Err.name = 'validation failed';
                    Err.message = `invalid configuration for '${container}'`;
                    cb(Err);
                break;
            }

            async.waterfall([
            	(callback) => {
            		// CHECK IF CONTAINER IS EXISTS
            		Storage.getContainer(contcfg.dirName, (err) => callback(null, err ? err.code : 'OK'))
            	},
            	(cont, callback) => {
            		// CREATE CONTAINER IF IT IS NOT EXISTS
            		switch (cont) {
            			case 'OK': callback(null)
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
                    if (file) {
                        let isValid = true;
                        let fileType = _.get(file, 'type');

                		isValid = isValid && fileType.substring(0, fileType.indexOf('/')) === "image";
                		if (!isValid) {
                            Err.name = 'validation failed'
                            Err.status = 400
                            Err.message = `invalid uploaded file type '${fileType.substring(0, fileType.indexOf('/'))}'`
                        }

                		isValid = isValid && Number(_.get(file, 'size')) <= contcfg.maxSize;
                		if (!isValid) {
                            Err.name = 'validation failed'
                            Err.status = 400
                            Err.message = 'maximum uploaded file size exceeds'
                        }

                		callback(!isValid ? Err : null, isValid ? file : null);
                    }

            	},
            	(file, callback) => {
            		// CREATE IMAGE OBJECT FROM FILE
            		lwip.open(_.get(file, 'path'), (err, img) => {
            			if (!err)
            				callback(null, {
            					hash: crypto.createHmac('md5', `${contcfg.key}=${currentUser.id}`).update(file.path).digest('hex'),
            					size: _.get(file, 'size'),
            					type: _.get(file, 'type'),
            					ext: _.get(file, 'type').substr(_.get(file, 'type').indexOf('/') + 1),
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
            name: 'get',
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

        	async.waterfall([
        		(callback) => {
        			this.Model.findOne({
        				where: {
        					uid: uid,
                            deleted: false
        				}
        			})
    				.then((media) => callback(media ? null : 'not-found', media))
    				.catch((err) => callback(err))
        		}
        	], (err, media) => {
        		if (!err) {
        			res.setHeader('Content-type', media.type);
    				let readStream = fs.createReadStream(`./storage/${media.storage}/${media.hash}`);
    				readStream.pipe(res)
        		}
        		else cb(err)
        	});

        	return cb.promise;
        });
    }

    set () {

    	let Settings = {
            name: 'set',
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
        	const id = data.id;
        	let ctx = loopback.getCurrentContext();
            let currentUser = ctx.get('currentUser');

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
    				.then((media) => callback(media ? null : 'not-found', media))
    				.catch((err) => callback(err))
        		},
        		(media, callback) => {
        			// CHECK IF ASSIGNED ID IS FOR CONTENT WITH SAME TYPE
        			let contCfg = configs[media.assign_type].picture;
        			app.models[contCfg.model].findOne({
        				where: {
        					id: id,
        					$or: [
        						{ ownerId: currentUser.personId },
        						{ personId: currentUser.personId }
        					]
        				}
        			})
        			.then((data) => callback(data ? null : 'not-found', media, data.id))
        			.catch((err) => callback(err))
        		},
        		(media, assign_id, callback) => {
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

}

module.exports = (Media) => new Medias(Media);
