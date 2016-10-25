//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var loopback = require('loopback');

module.exports = exports;

exports.Errors = require('./errors');

exports.RemoteHooks = require('./remote-hooks');

exports.PromiseCallback = require('./promise-callback');

/**
 * Get current application
 * @returns {Application}
 */
exports.app = require('./application');

exports.Size = require('./size');

exports.Dates = require('./dates');