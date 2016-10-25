"use strict";
//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = exports;

var underscore = require('underscore');

var defaults = {
    status: -1,
    statusText: '',
    errorKey: '',
    type: '',
    extra: null
};

class _Error {
    constructor(params) {
        var defaultKeys = underscore.keys(defaults);
        params = underscore.pick(params, defaultKeys);
        params = underscore.defaults(params, defaults);
        var self = this;
        underscore.forEach(underscore.keys(params), function (key) {
            self[key] = params[key];
        });
    }

    toJSON() {
        return underscore.pick(this, underscore.keys(defaults));
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }
}

exports.ParseInfrastructureError = function (err) {
    if (!err) return err;
    if (err.code == 'ENOTFOUND') {
        return new exports.Network({extra: err});
    }
    return exports.General({extra: err});
};

exports.General = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'General';
        params.errorKey = 'messaging.sms.general';
        super(params);
    }
};

exports.NotImplemented = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'NotImplemented';
        params.errorKey = 'messaging.sms.not-implemented';
        super(params);
    }
};

exports.SystemDefinitionWrong = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'SystemDefinitionWrong';
        params.errorKey = 'messaging.sms.system-definition-wrong';
        super(params);
    }
};

exports.Network = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'Network';
        params.errorKey = 'messaging.sms.network';
        super(params);
    }
};

exports.SendError = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'SendError';
        super(params);
    }
};

exports.UnregisteredTokenError = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'UnregisteredTokenError';
        params.errorKey = 'messaging.sms.unregistered-token';
        super(params);
    }
};

exports.ErrorDefTranslations = {
    'messaging.sms.general': 'General error',
    'messaging.sms.not-implemented': 'Not implemented',
    'messaging.sms.system-definition-wrong': 'System definition is wrong',
    'messaging.sms.network': 'Network error',
    'messaging.sms.unregistered-token': 'Unregistered token(s)'
};