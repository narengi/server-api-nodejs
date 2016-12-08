'use strict'

const MainHandler = require('../Handlers/Main')

class Medias extends MainHandler {

  constructor (Media) {
    super(Media)
		// Register Methods
    this.upload()
  }

  upload () {
    let Settings = {
      name: 'UploadMedia',
      description: 'upload new medias',
      path: '/upload',
      method: 'POST',
      status: 201,
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
        arg: 'result',
        type: 'object'
      }
    }

    this.registerMethod(Settings, (req, res, cb) => {
        	console.log(req.body)

        	setTimeout(() => {
        		cb(null, 'OK')
        	}, 1000)

      return cb.promise
    })
  }

}

module.exports = (Media) => new Medias(Media)
