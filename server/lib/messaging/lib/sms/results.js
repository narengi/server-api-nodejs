"use strict";
//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var underscore = require('underscore');

module.exports = exports;

var defaults = {
    messageId: -1,
    isSuccessful: false,
    sendDate: null,
    extra: null
};

exports.SendOne = class {
    constructor(result){
        result = result || {};
        var defaultKeys = underscore.keys(defaults);
        result = underscore.pick(result, defaultKeys);
        result = underscore.defaults(result, defaults);
        var self = this;
        underscore.forEach(underscore.keys(result), function (key) {
            self[key] = result[key];
        });
    }

    toJSON() {
        return underscore.pick(this, underscore.keys(defaults));
    }
};