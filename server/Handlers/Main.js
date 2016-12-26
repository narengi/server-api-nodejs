'use strict'

const http = require('http');

class MainHandler {

  constructor(Model) {
    this.Model = Model
  }

  registerMethod(data, handler) {
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

  Error({ status = 200, message, code }, callback) {
    let ErrObj = {
      status: status,
      statusCode: status,
      code: code || http.STATUS_CODES[status],
      message: message
    }
    ErrObj.message = ErrObj.message || ErrObj.code;
    callback(ErrObj)
  }

  get Memory() {
    let kDec = 2;
    var memoryObj = process.memoryUsage();
    var bytes = parseInt(memoryObj.rss);
    if (bytes) {
      var MBytes = bytes / (1024 * 1024);
      var roundedMegabytes = Math.round(MBytes * Math.pow(10, kDec)) / Math.pow(10, kDec);
      return `memory: ${roundedMegabytes.toString()} mb | time: ${Date.now() - this.startTime} ms`;
    }
  }

}

module.exports = MainHandler
