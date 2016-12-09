'use strict'

const loopback = require('loopback');
const configs = serverRequire('server').settings;
const MainHandler = require('../Handlers/Main');

class Medias extends MainHandler {

    constructor(Media) {
        super(Media)
            // Register Methods
        this.upload()
    }

    upload() {

        let Settings = {
            name: 'upload',
            description: 'upload new medias',
            path: '/upload',
            method: 'post',
            status: 201,
            accepts: [{
                arg: 'data',
                type: 'object',
                http: {
                    source: 'body'
                }
            }],
            returns: {
                arg: 'fileObject',
                type: 'object',
                root: true
            }
        }

        this.registerMethod(Settings, (data, cb) => {

        	console.log(loopback.StorageService);
        	// required options: maxFileSize

            // let ctx = loopback.getCurrentContext();
            // let currentUser = ctx.get('currentUser');
            // if (!currentUser) return cb(Security.Errors.NotAuthorized());

            // let config = configs.userProfile.picture;
            // let uploadOptions = {
            //     owner_id: currentUser.id,
            //     destDir: "",
            //     fieldName: "",
            //     maxSize: "",
            //     hash: "",
            //     styles: ""
            // };

            // options["destDir"] = `${__dirname}/../../${config.root}/${config.dirName}/${options.uid}`;
            // options["fieldName"] = config.fieldName;
            // options["maxSize"] = config.maxSize;
            // options["hash"] = true;
            // options["styles"] = underscore.extend({ original: "original" }, config.styles);

            cb(null, "OK")
            return cb.promise
        })
    }

}

module.exports = (Media) => new Medias(Media);
