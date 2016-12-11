'use strict'

const loopback = require('loopback');
const app = serverRequire('server');
const configs = app.settings;
const MainHandler = require('../Handlers/Main');
const Http = require('narengi-utils').Http;
const lwip = require('lwip');
const async = require('async');
const crypto = require('crypto');
const fs = require('fs');
const _ = require('lodash');

class Medias extends MainHandler {

    constructor (Media) {
        super(Media)
        // Register Methods
        this.upload()
        this.download()
    }

    upload () {

        let Settings = {
            name: 'upload',
            description: 'upload new medias',
            path: '/upload/:section?',
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

            const Storage = app.models.Storage;
            let container = req.params.section && req.params.section.trim().length ? `${req.params.section.trim()}` : `cached`;
            let contcfg = _.has(configs, container) ? configs[container].picture : {};
            let ctx = loopback.getCurrentContext();
            let currentUser = ctx.get('currentUser');

            // VALIDATE CONFIGS
            switch (true) {
            	case !Object.keys(contcfg).length:
            	case !_.has(contcfg, 'dirName') || !contcfg.dirName.trim().length:
            	case !_.has(contcfg, 'maxSize') || typeof contcfg.maxSize !== "number":
            	case !_.has(contcfg, 'key') || !contcfg.key.trim().length:
            		cb('section configs is not valid');
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
            		let isValid = true;
            		let errMsg = null;

            		isValid = isValid && file.type.substring(0, file.type.indexOf('/')) === "image";
            		if (!isValid && !errMsg) errMsg = "error-file-type";

            		isValid = isValid && file.size <= contcfg.maxSize;
            		if (!isValid && !errMsg) errMsg = "error-file-size";

            		callback(errMsg, isValid ? file : null);

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

    download () {

    	let Settings = {
            name: 'download',
            description: 'download medias',
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
        					uid: uid
        				}
        			})
    				.then((media) => callback(null, media))
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

}

module.exports = (Media) => new Medias(Media);
