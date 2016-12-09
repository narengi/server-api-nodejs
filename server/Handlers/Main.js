'use strict'

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

}

module.exports = MainHandler
