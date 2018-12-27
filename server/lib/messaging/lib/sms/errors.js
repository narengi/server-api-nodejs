"use strict";
//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
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
        params.errorKey = 'messaging.push.general';
        super(params);
    }
};

exports.NotImplemented = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'NotImplemented';
        params.errorKey = 'messaging.push.not-implemented';
        super(params);
    }
};

exports.SystemDefinitionWrong = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'SystemDefinitionWrong';
        params.errorKey = 'messaging.push.system-definition-wrong';
        super(params);
    }
};

exports.Network = class extends _Error {
    constructor(params) {
        params = params || {};
        params.type = 'Network';
        params.errorKey = 'messaging.push.network';
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

exports.ErrorDefTranslations = {
    'messaging.push.general': 'General error',
    'messaging.push.not-implemented': 'Not implemented',
    'messaging.push.system-definition-wrong': 'System definition is wrong',
    'messaging.push.network': 'Network error'
};