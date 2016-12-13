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
    if (data.error) {
      const ModelErr = function (...err) {
        let _self = this;
        let idx = 0;
        Object.keys(data.error).map((key) => {
          if (typeof err[idx] === data.error[key])
            _self[key] = err[idx];
          idx++;
        });
        _self.name = err.name || String(`${data.name} error handler`).toUpperCase();
        _self.status = Number(_self.status) || 500;
        _self.statusCode = _self.status;
        _self.message = _self.message || http.STATUS_CODES[_self.status];
        return _self;
      }
      ModelErr.prototype = Object.create(Error.prototype);
      ModelErr.prototype.constructor = ModelErr;
      this.Error = ModelErr;
    }
    this.Model[data.name] = handler
  }

}

module.exports = MainHandler
