'use strict'

const http = require('http');

class MainHandler {

  constructor (Model) {
    this.Model = Model
  }

  registerMethod (data, handler) {
    this.Model.remoteMethod(data.name, {
      description: data.description || '',
      accepts: data.accepts || [],
      returns: data.returns || {},
      http: {
        path: data.path || '/',
        verb: data.method ? data.method.toLowerCase() : 'get',
        status: data.status || 200
      }
    })
    this.Model[data.name] = handler
  }

  Error ({status = 200, message, code}, callback) {
    let ErrObj = {
      status: status,
      statusCode: status,
      code: code || http.STATUS_CODES[status],
      message: message
    }
    ErrObj.message = ErrObj.message || ErrObj.code;
    callback(ErrObj)
  }

}

module.exports = MainHandler
