'use strict';
//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

/**
 * @class Context
 * @memberOf http-context
 */
var Context = class {
    constructor(name) {
        this.name = name;
        this.user = null;
        this.token = null;
        this.locale = null;
        this.reqSource = null;
    }

    /**
     *
     * @param name
     * @returns {http-context.Context}
     * @static
     */
    static CreateContext(name) {
        return new Context(name);
    }

    setUser(user) {
        this.user = user;
    }

    getUser() {
        return this.user;
    }

    setToken(token) {
        this.token = token;
    }

    setReqSource(source) {
        this.reqSource = source;
    }

    getReqSource() {
        return this.reqSource;
    }

    setLocale(locale) {
        this.locale = locale;
    }

    getLocale() {
        return this.locale;
    }
};

module.exports = Context;