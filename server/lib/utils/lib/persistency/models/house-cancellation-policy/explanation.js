"use strict";

//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var underscore = require('underscore');

module.exports = exports;

var FIELDS = ['title', 'date', 'order', 'description'];

/**
 * This class is part of house cancellation policy explaining the policy by sample.
 * @type {Explanation}
 * @class
 */
exports.Explanation = class Explanation {
    constructor(data) {

        this.title = "";
        this.date = "";
        this.order = 1;
        this.description = "";

        if (underscore.isObject(data)) {
            var self = this;
            underscore.each(FIELDS, function (field) {
                if (underscore.has(data, field)) {
                    self[field] = data[field];
                }
            });
        }
    }

    /**
     * Creates array or single object of `Explanation` type.
     * If `data` is nothing then `null` returned.
     * @param {array|object} data
     * @returns {array|object}
     */
    static Create(data) {
        var ret = [];
        if (underscore.isArray(data)) {
            underscore.each(data, function (item) {
                ret.push(new Explanation(item));
            });
        }
        else if (underscore.isObject(data)) {
            ret = new Explanation(data);
        }
        else {
            return null;
        }
        return ret;
    }

    toJSON() {
        var ret = {
            title: this.title,
            date: this.date,
            order: this.order,
            description: this.description
        };
        return ret;
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }
};
