//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

const LoopBackContext = require('loopback-context'),
    underscore = require('underscore'),
    randomString = require("randomstring"),
    app = serverRequire('server'),
    moment = require('moment'),
    async = require('async'),
    promiseCallback = require('narengi-utils').Common.PromiseCallback,
    crudHandler = require('narengi-utils').Persistency.CrudHandlers,
    Common = require('narengi-utils').Common,
    Persistency = require('narengi-utils').Persistency,
    Pagination = require('narengi-utils').Pagination,
    Security = require('narengi-utils').Security,
    makeError = Common.Errors.makeError,
    ObjectID = require('mongodb').ObjectID,
    _ = require('lodash');

/**
 * @class
 * @constructor
 */
module.exports = function(Account) {
    init(Account);
    defineProperties(Account);
    addHooks(Account);
    initMethods(Account);
    addLoginLogoutMethods(Account);
    addRegisterMethod(Account);
    addCrudMethods(Account);
    addExtraMethods(Account);
};

var init = function(Account) {

    Account.disableRemoteMethod('confirm', true);
    Account.disableRemoteMethod('login', true);

    // Deleting unused `validation` & `relations` exactly
    delete Account.relations.accessTokens;
    delete Account.validations.email;
    delete Account.validations.username;

    //Redefine correct validation
    Account.validatesUniquenessOf('email', {
        message: 'error.user.validation.email_existed'
    });
    Account.validatesUniquenessOf('username', {
        message: 'error.user.validation.username_existed'
    });

    Account.prototype.person = function(cb) {
        cb = cb || promiseCallback();
        if (this.personId)
            app.models.Person.findById(this.personId, cb);
        else
            cb(null, null);
        return cb.promise;
    };
};

function defineProperties(Account) {

    function getDisplayName() {
        var profile = this.profile() && this.profile().value();
        if (!profile) return '---';
        return `${profile.DisplayName}`;
    }

    Object.defineProperty(Account.prototype, "DisplayName", {
        get: function() {
            if (this && this.profile && this.profile.value())
                return `${this.profile.value().title || ''} ${this.profile.value().firstName || ''} ${this.profile.value().lastName || ''}`;
            return "---";
        },
        configurable: true,
        enumerable: true
    });

    Account.setter.email = function(value) {
        value = value || "";
        this.$email = value.trim().toLowerCase();
    };

    Account.setter.username = function(value) {
        value = value || "";
        this.$username = value.trim().toLowerCase();
    };
}

var addHooks = function(Account) {
    Account.observe('before save', function(ctx, next) {
        if (ctx.options && ctx.options.skipUpdatedAt) {
            return next();
        }
        if (ctx.instance) {
            ctx.instance['updatedAt'] = new Date();
        } else {
            ctx.data['updatedAt'] = new Date();
        }
        next();
    });

    /**
     * Ensures each `Account` has a `Person`
     */
    Account.observe('before save', function(ctx, next) {
        var instance = ctx.instance || ctx.currentInstance;
        if (instance) {
            if (!instance.personId) {
                app.models.Person.create({}, function(err, person) {
                    if (!err) {
                        if (ctx.data)
                            ctx.data["personId"] = person.id;
                        if (instance)
                            instance.personId = person.id;
                    }
                    next();
                });
            } else {
                next();
            }
        } else {
            //do nothing
            next();
        }

    });
};

var initMethods = function(Account) {
    /**
     * Finds `Account` based on `username` or `email`
     **/
    Account.findByUsernameOrEmail = function(usernameOrEmail, cb) {
        cb = cb || promiseCallback();
        usernameOrEmail = usernameOrEmail || "";
        usernameOrEmail = usernameOrEmail.trim().toLowerCase();
        Account.findOne({
                where: {
                    or: [{
                        "username": `${usernameOrEmail}`
                    }, {
                        "email": `${usernameOrEmail}`
                    }]
                }
            },
            function(err, account) {
                if (err) return cb(err);
                cb(null, account);
            });
        return cb.promise;
    };

    Account.afterRemote("findByUsernameOrEmail", Common.RemoteHooks.convert2Dto(Account, {}));

    Account.remoteMethod(
        'findByUsernameOrEmail', {
            description: 'Returns account by username/email',
            accepts: [{
                arg: 'identity',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            returns: {
                arg: 'account',
                type: 'object',
                root: true
            },
            http: {
                path: "/by-username/:identity",
                verb: 'get'
            }
        }
    );

    Account.GetById = function(id, cb) {
        cb = cb || promiseCallback();

        Account.findById(id)
            .then((account) => {
                if (!account) return cb(Persistency.Errors.NotFound());
                account.displayName = ((account.profile().firstName || '') + ' ' + (account.profile().lastName || '')).trim();
                cb(null, account);
            }).catch((e) => {
                cb(e);
            });
        return cb.promise;
    };

    Account.afterRemote("GetById", Common.RemoteHooks.convert2Dto(Account, { justProfile: true }));
    Account.afterRemote("GetById", (ctx, instance, next) => {
        let result = {};
        let requiredFields = [
            { fld: 'id', label: 'uid' },
            { fld: 'displayName', label: 'fullName' },
            { fld: 'profile.bio', label: 'bio' },
            { fld: 'profile.country', label: 'country' },
            { fld: 'profile.province', label: 'province' },
            { fld: 'profile.city', label: 'city' },
            { fld: 'profile.picture.url', label: 'avatar' },
            { fld: 'houses', label: 'houses' }
        ];
        _.map(_.keyBy(requiredFields, 'fld'), (fld) => {
                if (fld.label === 'avatar') {
                    result[fld.label] = `/medias/get/${ctx.result.id}`
                    result.picture = { url: result[fld.label] }
                } else {
                    result[fld.label] = _.get(ctx.result, fld.fld);
                }
            })
            // GET HOUSES
        app.models.House.find({
                where: {
                    ownerId: ctx.result.personId
                },
                limit: 3,
                skip: 0,
                order: '_id DESC',
                fields: ['id', 'name', 'status', 'summary', 'prices']
            })
            .then((houses) => {
                if (houses && houses.length) {
                    _.map(houses, (house, idx) => {
                        house.price = house.prices && Number(house.prices.price) > 0 ? `${house.prices.price} هزار تومان` : 'رایگان';
                        house.pictures = [];
                        // Get House Pitures -- I know this method is not good but we are in release night!!
                        app.models.Media.find({
                                where: {
                                    assign_type: 'house',
                                    assign_id: house.id,
                                    is_private: false,
                                    deleted: false
                                },
                                order: '_id DESC',
                                fields: ['uid']
                            })
                            .then((medias) => {
                                if (medias && medias.length) {
                                    _.each(medias, (media) => house.pictures.push({ url: `/medias/get/${media.uid}` }))
                                }
                                if (idx === houses.length - 1) {
                                    result = _.merge(result, { houses: houses });
                                    ctx.result = result;
                                    next();
                                }
                            })
                            .catch((err) => next(err));
                    });
                } else {
                    ctx.result = result;
                    next();
                }
            })
            .catch((err) => {
                next(err);
            })
    });

    Account.remoteMethod(
        'GetById', {
            description: 'Returns account by id',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            returns: {
                arg: 'account',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id",
                verb: 'get'
            }
        }
    );

    /**
     * GET USERS HOUSES
     */
    Account.GetHouses = function(req, paging, cb) {

        const owner = req.params.uid || null;

        async.waterfall([
            (callback) => {
                // GET OWNER
                Account.findById(owner, callback);
            },
            (Owner, callback) => {
                // GET OWNER HOUSES BASE ON PAGING
                let cond = _.merge(paging, {
                    where: { ownerId: ObjectID(Owner.personId) },
                    order: '_id DESC',
                    fields: ['id', 'name', 'status', 'summary', 'prices']
                })
                app.models.House.find(cond, callback);
            },
            (Houses, callback) => {
                if (Houses && Houses.length) {
                    _.map(Houses, (house, idx) => {
                        house.price = house.prices && Number(house.prices.price) > 0 ? `${house.prices.price} هزار تومان` : 'رایگان';
                        house.pictures = [];
                        app.models.Media.find({
                                where: {
                                    assign_type: 'house',
                                    assign_id: house.id,
                                    is_private: false,
                                    deleted: false
                                },
                                order: '_id DESC',
                                fields: ['uid']
                            })
                            .then((medias) => {
                                if (medias && medias.length) {
                                    _.each(medias, (media) => house.pictures.push({ url: `/medias/get/${media.uid}` }))
                                }
                                if (idx === Houses.length - 1) {
                                    cb(null, Houses)
                                }
                            })
                            .catch((err) => callback(err));
                    });
                } else {
                    callback(null, Houses);
                }
            }
        ], (err, result) => {
            cb(err ? err : null, err ? null : result);
        });

        return cb.promise;
    }

    Account.remoteMethod(
        'GetHouses', {
            description: 'Get Houses By Owner ID',
            accepts: [{
                arg: 'req',
                type: 'object',
                http: {
                    source: 'req'
                }
            }, {
                arg: 'paging',
                type: 'object',
                http: Pagination.RemoteAccepts.analyzeRequest
            }],
            returns: {
                arg: 'houses',
                type: 'object',
                root: true
            },
            http: {
                path: "/:uid/houses",
                verb: 'get'
            }
        }
    );

    /**
     * Determines if account is verfiied or not
     **/
    Account.prototype.isVerified = function() {
        var last = this.lastVerification();
        if (this.verifications.count() === 0 && last === null) {
            return false;
        }
        if (last) {
            return last.verified;
        }
        return false;
    };

    /**
     * Returns last `AccountVerification` for `this` `Account`
     * @method
     **/
    Account.prototype.lastVerification = function() {
        var len = this.verifications.value().length;
        if (len && len > 0) {
            var nextYear = moment().add(500, 'y');
            var list = underscore.sortBy(this.verifications.value(), function(verification) {
                return nextYear.diff(moment(verification.requestDate));
            });
            return list[0];
        } else {
            return null;
        }
    };

    Account.prototype.lastVerificationOfType = function(type) {
        var list = this.verificationsOfType(type);
        if (list && list.length > 0) {
            return list[0];
        } else {
            return null;
        }
    };

    Account.prototype.verificationsOfType = function(type) {
        var list = this.verifications.value();
        list = underscore.filter(list, function(item) {
            return item.verificationType.toLowerCase() === type.toLowerCase();
        });
        var nextYear = moment().add(500, 'y');
        list = underscore.sortBy(list, function(verification) {
            return nextYear.diff(moment(verification.requestDate));
        });
        return list;
    };

    /**
     * Returns `VerificationTypeEnum`
     * **Note**: This function should be defined as a `getter` method. But in `loopback` there is a mechanism which prevents that.
     **/
    Account.prototype.getVerificationType = function() {
        if (this.getRegistrationSource().is('web')) {
            return app.VerificationTypeEnum.get('email');
        } else if (this.getRegistrationSource().is('mobile')) {
            return app.VerificationTypeEnum.get('sms');
        } else {
            return app.VerificationTypeEnum.get('none');
        }
    };

    /**
     * Returns `RegistrationSourceEnum`
     * **Note**: This function should be defined as a `getter` method. But in `loopback` there is a mechanism which prevents that.
     **/
    Account.prototype.getRegistrationSource = function() {
        if (this.registrationSource instanceof Enum) {
            return this.registrationSource;
        }
        return app.RegistrationSourceEnum.get(this.registrationSource);
    };

    Account.prototype.usernameOrEmail = function() {
        if (this.username && this.username !== "") {
            return this.username;
        }
        return this.email;
    };
};

var addLoginLogoutMethods = function(Account) {
    // Login process

    /**
     * @param(Object) credentials username/password
     * ```
     * {"username": "<username or email>", "password": "<password>"}
     * ```
     * @callback {Function} cb
     **/
    Account.CustomLogin = function(credentials, cb) {
        var defaultError = makeError({
            message: 'error.user.login.failed',
            statusCode: 401,
            code: 'LOGIN_FAILED'
        });

        var tokenErrorHandler = function(ex) {
            console.log(ex);
            var error = makeError({
                message: 'error.user.token_not_created',
                statusCode: 500,
                code: 'USER_AUTHTOKEN_NOT_CREATED'
            });
            cb(error);
        };

        var passwordNotMatchHandler = function(ex) {
            var error = makeError({
                message: 'error.user.password_not_match',
                statusCode: 401,
                code: 'USER_PASSWORD_NOT_MATCH'
            });
            cb(error);
        };

        var tokenInitializedHandler = function(authToken, account) {
            account.updateAttributes({
                lastLoginDate: new Date()
            }, function(err, updatedAccount) {
                if (err) {
                    cb(err);
                } else {
                    cb(null,
                        app.models.AccountDTO.Convert(updatedAccount)
                    );
                }
            });
        };

        cb = cb || promiseCallback();

        credentials.username = credentials.username ? credentials.username.trim() : null;

        if (!(credentials.username && credentials.password)) {
            var error = makeError({
                message: 'error.user.required.username_and_password',
                statusCode: 400,
                code: 'USERNAME_AND_PASSWORD_REQUIRED'
            });
            cb(error);
            return cb.promise;
        }

        Account.findByUsernameOrEmail(credentials.username, function(err, account) {
            if (err || !account) {
                var error = makeError({
                    message: 'error.user.op.not_found',
                    statusCode: 404,
                    code: 'USER_NOT_FOUND'
                });
                cb(error);
                return cb.promise;
            }

            if (!account.enabled) {
                var error = makeError({
                    message: 'error.user.banned',
                    statusCode: 401,
                    code: 'USER_BANNED'
                });
                cb(error);
                return cb.promise;
            }

            account.hasPassword(credentials.password).then(function(isMatch) {
                if (isMatch) {

                    /*if (!account.isVerified()) {
                        var error = makeError({
                            message: 'error.user.not_verified',
                            statusCode: 401,
                            code: 'USER_NOT_VERIFIED'
                        });
                        cb(error);
                        return cb.promise;
                    }*/

                    //renew `AuthToken`
                    app.models.AuthToken.createToken().then(function(token) {
                        var params = {
                            token: token,
                            updatedAt: new Date()
                        };

                        if (account.authToken.value()) {
                            account.authToken.update(params).then(function(authToken) {
                                tokenInitializedHandler(authToken, account);
                            }).catch(tokenErrorHandler);
                        } else {
                            account.authToken.create(params).then(function(authToken) {
                                tokenInitializedHandler(authToken, account);
                            }).catch(tokenErrorHandler);
                        }
                    }).catch(tokenErrorHandler);

                } else { //password not match
                    passwordNotMatchHandler();
                }
            }).catch(passwordNotMatchHandler);
        });

        return cb.promise;
    };

    Account.remoteMethod(
        'CustomLogin', {
            description: 'Login a user with username/email and password.',
            accepts: [{
                arg: 'credentials',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            returns: {
                arg: 'accessToken',
                type: 'object',
                root: true
            },
            http: {
                path: "/login",
                verb: 'post'
            }
        }
    );

    // end of Login process

    // Logout process

    /**
     * Logout current user.
     * Current user is authorized user by data sent in `request` header.
     * It is silent about non logged in users or undefined users.
     **/
    Account.CustomLogout = function(req, cb) {
        cb = cb || promiseCallback();

        let ctx = LoopBackContext.getCurrentContext(),
            currentUser = ctx && ctx.get('currentUser'),
            authToken = currentUser.authToken() || null;

        if (currentUser && authToken && authToken.token) {
            Account.findById(currentUser.id, function(err, acc) {
                if (err) {
                    cb(err);
                } else if (acc) {
                    if (acc.authToken.value()) {
                        if (acc.authToken.value().token === authToken.token) {
                            acc.authToken.destroy(cb);
                        } else {
                            cb(null);
                        }
                    }
                }
            });
        } else {
            cb(null);
        }

        return cb.promise;
    };

    Account.remoteMethod(
        'CustomLogout', {
            description: 'Logout Current User',
            accepts: [{
                arg: 'req',
                type: 'object',
                required: true,
                http: {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object',
                root: true
            },
            http: {
                path: "/logout",
                verb: 'get',
                status: 200
            }
        }
    );

    // end of Logout process
}

/**
 *    Handles create or update of `Account`
 *
 **/
var accountCreateHandler = function(Account, account, password, verificationType, cb) {
    var verificationCodeLen = app.settings.narengi.verificationCodeLen || 4;
    var verified = false || verificationType.is('none');
    account.verifications.create({
        verificationType: verificationType,
        verified: verified,
        code: randomString.generate({
            length: verificationCodeLen,
            charset: 'numeric'
        })
    }).then(function(verification) {
        if (verificationType.is('none')) {
            var credential = { username: account.usernameOrEmail(), password: password };
            return Account.CustomLogin(credential, cb);
        }
        cb(null, account);
    }).catch(function(ex) {
        var error = makeError({
            message: 'error.user.registeration_failed',
            statusCode: 500,
            code: 'USER_REGISTRATION_FAILED'
        });
        cb(error);
    });
};

var passwordValidation = function(force) {
    return function(ctx, instance, next) {
        var data = ctx.req.body;
        var passwordLen = app.settings.narengi.passwordLen || 4;
        if (!data || (force && (!data.password || data.password.length < passwordLen))) {
            var error = makeError({
                message: 'error.user.validation.password_length',
                statusCode: 400,
                code: 'USER_FORM_INVALID'
            });
            return next(error);
        }
        next();
    };
};

/**
 * Update Profile Handler
 */
function updateProfile(account, data, cb) {
    cb = cb || promiseCallback();
    account.profile.update(data, cb);
    return cb.promise;
};

var addRegisterMethod = function(Account) {

    Account.beforeRemote("CustomRegister", passwordValidation(true));

    Account.CustomRegister = function(data, req, cb) {
        cb = cb || promiseCallback();

        var ctx = req.getNarengiContext();

        // check for validity of `data` and sanitize it
        if (!(data && (data.email || data.username) && data.password)) {
            var error = makeError({
                message: 'error.user.validation.form_not_valid',
                statusCode: 400,
                code: 'USER_FORM_INVALID'
            });
            cb(error);
            return cb.promise;
        } else {
            var form = {
                email: "",
                username: undefined,
                password: "",
                displayName: "",
                cellNumber: ""
            };
            data = underscore.pick(data, underscore.keys(form));
            data = underscore.defaults(data, form);
        }

        var verificationType = app.VerificationTypeEnum.get('none');

        //EXP : do not throw error if there is no email/cellnumber
        /* if (ctx.getReqSource().is('mobile')) {
         if (data.cellNumber === "") {
         var error = new Error('error.user.validation.cellnumber_required');
         error.statusCode = 400;
         error.code = 'USER_FORM_INVALID';
         cb(error);
         return cb.promise;
         }
         verificationType = app.VerificationTypeEnum.get('sms');
         } else {
         if (data.email === "") {
         var error = new Error('error.user.validation.email_required');
         error.statusCode = 400;
         error.code = 'USER_FORM_INVALID';
         cb(error);
         return cb.promise;
         }
         verificationType = app.VerificationTypeEnum.get('email');
         }*/

        var accountCreateUpdateErrorHandler = function(ex) {
            cb(ex);
        };

        console.log("CREATE DATA", data);

        Account.create(data).then(function(createdAccount) {
            createdAccount.profile.create(function(e, profile) {
                accountCreateHandler(Account, createdAccount, data.password, verificationType, cb);
            });
        }).catch(accountCreateUpdateErrorHandler);

        return cb.promise;
    };

    Account.remoteMethod(
        'CustomRegister', {
            description: 'Registers an account',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: { source: 'body' }
            }, {
                arg: 'req',
                type: 'object',
                required: true,
                http: { source: 'req' }
            }],
            returns: {
                arg: 'account',
                type: 'object',
                root: true,
            },
            http: {
                path: "/register",
                verb: 'post',
                status: 201
            }
        }
    );
};

var addCrudMethods = function(Account) {

    // remote hooks

    function checkInputForCreateUpdate(ctx, instance, next) {
        var body = ctx.req.body;

        if (!body.verificationType) {
            body.verificationType = app.settings.narengi.verificationType;
        }

        ctx.req.body = body;
        next();
    };

    function accountCreateUpdateErrorHandler(cb) {
        return function(ex) {
            cb(ex);
        };
    }

    /**
     * Creates an `Account` instance
     * @param {Object} data
     * @param {Callback} cb
     * @return {Promise}
     * @method
     */
    Account.CustomCreate = function(data, cb) {
        cb = cb || promiseCallback();

        var verificationType = app.VerificationTypeEnum.get(data.verificationType);

        Account.create(data).then((createdAccount) => {
            accountCreateHandler(Account, createdAccount, data.password, verificationType, cb);
        }).catch(accountCreateUpdateErrorHandler(cb));

        return cb.promise;
    };

    Account.beforeRemote("CustomCreate", passwordValidation(true));
    Account.beforeRemote("CustomCreate", checkInputForCreateUpdate);
    Account.afterRemote("CustomCreate", Common.RemoteHooks.convert2Dto(Account, {}));

    Account.remoteMethod(
        'CustomCreate', {
            description: 'Creates an account',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            returns: {
                arg: 'account',
                type: 'object',
                root: true,
            },
            http: {
                path: "/",
                verb: 'post',
                status: 201
            }
        }
    );

    /**
     * Update an `Account` instance
     * @param {String} id
     * @param {Object} data
     * @param {Callback} cb
     * @return {Promise}
     * @method
     */
    Account.CustomUpdate = function(id, data, cb) {
        cb = cb || promiseCallback();
        async.waterfall([
            function(callback) {
                Account.findById(id, callback);
            },
            function(account, callback) {
                if (!account) return callback(Persistency.Errors.NotFound());
                account.updateAttributes(data, callback);
            }
        ], function(err, result) {
            if (err) return cb(err);
            cb(null, result);
        });

        return cb.promise;
    };

    Account.beforeRemote("CustomUpdate", passwordValidation(false));
    Account.beforeRemote("CustomUpdate", checkInputForCreateUpdate);
    Account.afterRemote("CustomUpdate", Common.RemoteHooks.convert2Dto(Account, {}));

    Account.remoteMethod(
        'CustomUpdate', {
            description: 'Updates an account',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: { source: 'path' }
            }, {
                arg: 'data',
                type: 'object',
                required: true,
                http: { source: 'body' }
            }],
            returns: {
                arg: 'account',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id",
                verb: 'put',
                status: 201
            }
        }
    );

    Account.GetAll = function(paging, cb) {
        cb = cb || promiseCallback();
        Account.find(paging).then(Persistency.CrudHandlers.arraySuccessHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    Account.afterRemote("GetAll", Common.RemoteHooks.convert2Dto(Account, {}));
    /**
     * Refine pagination arg
     */
    Account.beforeRemote("GetAll", Pagination.RemoteHooks.refinePaginationParams);
    Account.afterRemote("GetAll", Pagination.RemoteHooks.afterPaginatedService);

    Account.remoteMethod(
        'GetAll', {
            description: 'Get all accounts',
            accepts: [{
                arg: 'paging',
                type: 'object',
                required: true,
                http: Pagination.Common.HttpPagingParam
            }],
            returns: {
                arg: 'accounts',
                type: 'array',
                root: true
            },
            http: {
                path: "/",
                verb: 'get',
                status: 200
            }
        });

    Account.DeleteById = function(id, cb) {
        cb = cb || promiseCallback();
        Account.destroyById(id, cb);
        return cb.promise;
    };
    Account.remoteMethod(
        'DeleteById', {
            description: 'Deletes account by id',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: { source: 'path' }
            }],
            http: {
                path: "/:id",
                verb: 'delete',
                status: 204
            }
        });

    Account.ChangePassByAdmin = function(id, data, cb) {
        cb = cb || promiseCallback();
        async.waterfall([
            function(callback) {
                Account.findById(id, callback);
            },
            function(account, callback) {
                if (!account) return callback(Persistency.Errors.NotFound());
                account.updateAttributes({ password: data.password }, callback);
            }
        ], function(err, result) {
            if (err) return cb(err);
            if (!result) return cb(makeError({ message: 'error.operation.failure' }));
            cb(null);
        });
        return cb.promise;
    };

    Account.beforeRemote("ChangePassByAdmin", passwordValidation(false));

    Account.remoteMethod(
        'ChangePassByAdmin', {
            description: 'Changes password. It is for admin only',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: { source: 'path' }
            }],
            http: {
                path: "/:id/change-password-by-admin",
                verb: 'put',
                status: 204
            }
        });
};

var addExtraMethods = function(Account) {

    var banPerformer = function(data, banning, cb) {
        cb = cb || promiseCallback();

        if (!(data || data.accountId)) {
            var error = makeError({
                message: 'error.user.validation.id_required',
                statusCode: 400,
                code: 'USER_FORM_INVALID'
            });
            cb(error);
            return cb.promise;
        }

        Account.updateAll({
            id: data.accountId
        }, {
            enabled: banning
        }).then(function(updated, count) {
            cb(null, count);
        }).catch(function(err) {
            cb(err);
        });

        return cb.promise;
    };

    Account.Ban = function(data, cb) {
        return banPerformer(data, false, cb);
    };

    Account.remoteMethod(
        'Ban', {
            description: 'Ban an account.',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            http: {
                path: "/ban",
                verb: 'put',
                status: 204
            }
        }
    );

    Account.Unban = function(data, cb) {
        return banPerformer(data, true, cb);
    };

    Account.remoteMethod(
        'Unban', {
            description: 'Ban an account.',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            http: {
                path: "/unban",
                verb: 'put',
                status: 204
            }
        }
    );

    Account.remoteMethod(
        'IsCurrentAdmin', {
            description: 'Checks if current user is admin or not',
            returns: {
                arg: 'result',
                type: 'boolean',
                root: true
            },
            http: {
                path: "/is-current-admin",
                verb: 'get',
                status: 200
            }
        }
    );

    Account.remoteMethod(
        'IsAdmin', {
            description: 'Checks if user is admin or not',
            accepts: [{
                arg: 'userPrincipal',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            returns: {
                arg: 'result',
                type: 'boolean',
                root: true
            },
            http: {
                path: "/:userPrincipal/is-admin",
                verb: 'get',
                status: 200
            }
        }
    );

    Account.ShowProfile = function(id, cb) {
        cb = cb || promiseCallback();

        Account.GetById(id, cb);

        return cb.promise;
    };

    Account.prototype.getProfileDetailUrl = function() {
        var rel = `${Account.settings.http.path}/${this.id}/profile`;
        return Account.formatRelUrl(rel);
    };

    Account.afterRemote("ShowProfile", Common.RemoteHooks.convert2Dto(Account, { justProfile: true }));

    Account.remoteMethod(
        'ShowProfile', {
            description: 'Show account profile',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id/profile",
                verb: 'get',
                status: 200
            }
        }
    );


    Account.ShowProfileMe = function(req, cb) {
        cb = cb || promiseCallback();

        var currentUser = req.getNarengiContext().getUser();
        if (!currentUser) return cb(Security.Errors.NotAuthorized());
        Account.GetById(currentUser.id, cb);

        return cb.promise;
    };

    Account.afterRemote("ShowProfileMe", Common.RemoteHooks.convert2Dto(Account));
    Account.afterRemote("ShowProfileMe", (ctx, instance, next) => {
        ctx.result.profile.picture = {
            url: '/medias/avatar'
        }
        app.models.Media.findOne({
                where: {
                    owner_id: ctx.result.id,
                    assign_type: 'userprofile',
                    deleted: false
                },
                fields: ['uid'],
                order: '_id DESC'
            })
            .then((media) => {
                if (media) {
                    ctx.result.avatar = `/medias/get/${media.uid}`;
                }
                next();
            })
    });

    Account.remoteMethod(
        'ShowProfileMe', {
            description: 'Show account profile for current user',
            accepts: [{
                arg: 'req',
                type: 'object',
                required: true,
                http: {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object',
                root: true
            },
            http: {
                path: "/me",
                verb: 'get',
                status: 200
            }
        }
    );

    Account.SendResetPasswordByEmail = function(email, cb) {
        cb = cb || promiseCallback();
        async.waterfall([
            function(callback) {
                Account.findByUsernameOrEmail(email, callback);
            },
            function(account, callback) {
                if (!account) return callback(Persistency.Errors.NotFound());
                var locals = {
                    displayName: account.DisplayName
                };
                app.models.Notification.SendEmailResetPassword(email, account, locals).then((res) => {
                    callback(null, { result: 'sent' })
                }).catch((e) => {
                    callback(e)
                });
            }
        ], cb);
        return cb.promise;
    };

    Account.remoteMethod(
        'SendResetPasswordByEmail', {
            description: 'Send email to account owner to access to reset password',
            accepts: [{
                arg: 'email',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object',
                root: true
            },
            http: {
                path: "/reset-password/send/email/:email",
                verb: 'post',
                status: 201
            }
        }
    );

    Account.SendResetPasswordByMobile = function(email, cb) {
        cb = cb || promiseCallback();
        async.waterfall([
            function(callback) {
                Account.findByUsernameOrEmail(email, callback);
            },
            function(account, callback) {
                if (!account) return callback(Persistency.Errors.NotFound());
                var locals = {
                    displayName: account.DisplayName
                };
                app.models.Notification.SendEmailResetPassword(account.cellNumber, account, locals).then((res) => {
                    callback(null, { result: 'sent' })
                }).catch((e) => {
                    callback(e)
                });
            }
        ], cb);
        return cb.promise;
    };

    Account.remoteMethod(
        'SendResetPasswordByMobile', {
            description: 'Send sms to account owner to access to reset password',
            accepts: [{
                arg: 'email',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            returns: {
                arg: 'result',
                type: 'object',
                root: true
            },
            http: {
                path: "/reset-password/send/sms/:email",
                verb: 'post',
                status: 201
            }
        }
    );

    Account.ChangePassword = function(email, data, cb) {
        cb = cb || promiseCallback();
        var passwordLen = app.settings.narengi.passwordLen || 4;
        if (!data.password || data.password.trim().length < passwordLen) {
            var error = makeError({
                message: 'error.user.validation.password_length',
                statusCode: 400,
                code: 'USER_FORM_INVALID'
            });
            cb(error);
            return cb.promise;
        }
        async.waterfall([
            function(callback) {
                Account.findByUsernameOrEmail(email, callback);
            },
            function(account, callback) {
                if (!account) return callback(Persistency.Errors.NotFound());
                account.updateAttributes({
                    password: data.password
                }, callback);
            }
        ], cb);
        return cb.promise;
    };

    Account.afterRemote("ChangePassword", Common.RemoteHooks.convert2Dto(Account));

    Account.remoteMethod(
        'ChangePassword', {
            description: 'Change password of an account specified by email',
            accepts: [{
                arg: 'email',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }, {
                arg: 'data',
                type: 'object',
                required: true,
                http: { source: 'body' },
                description: 'Field `password` is required'
            }],
            returns: {
                arg: 'result',
                type: 'object',
                root: true
            },
            http: {
                path: "/change-password/:email",
                verb: 'put',
                status: 201
            }
        }
    );

    Account.UpdateProfile = function(data, cb) {
        cb = cb || promiseCallback();

        var ctx = LoopBackContext.getCurrentContext()
        var currentUser = ctx && ctx.get('currentUser');
        if (!currentUser) return cb(Security.Errors.NotAuthorized());

        var errMessages = [];
        Object.keys(data).map(function(key) {
            switch (key) {
                case 'firstName':
                case 'lastName':
                    if (currentUser.user_profile[key] && currentUser.user_profile[key].length) {
                        if (!data[key].trim().length) {
                            // var err = new Error();
                            // err.status = 400;
                            // err.message = key + ' value should not be empty.';
                            // errMessages.push(err);
                            delete data[key];
                        }
                    } else {
                        if (!data[key].trim().length) {
                            delete data[key];
                        }
                    }
                    break;
                default:
                    if (!data[key].trim().length) {
                        delete data[key];
                    }
            }
        });

        if (!errMessages.length)
            updateProfile(currentUser, data, cb);
        else
            cb(errMessages[0]);

        return cb.promise;
    };

    // Account.afterRemote("UpdateProfile", Common.RemoteHooks.convert2Dto(Account));

    Account.remoteMethod(
        'UpdateProfile', {
            description: 'Update Currentc User Profile',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }],
            http: {
                path: "/update",
                verb: 'put',
                status: 204
            }
        }
    );
};
