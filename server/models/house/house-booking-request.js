'use strict';
//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var app = serverRequire('server');
var Common = require('narengi-utils').Common;
var Pagination = require('narengi-utils').Pagination;
var Http = require('narengi-utils').Http;
var Persistency = require('narengi-utils').Persistency;
var Security = require('narengi-utils').Security;
var moment = require('moment');
var async = require('async');
var lodash = require('lodash');
var StateMachine = require('javascript-state-machine');

/**
 * Booking requests to a house
 * @namespace HouseBookingRequest
 */
module.exports = function (Housebookingrequest) {
    setupStateMachine(Housebookingrequest);
    addMainServices(Housebookingrequest);
};

function addMainServices(Model) {

    /**
     * Add request to a house. When an user books a house this request would be created.
     * @param {String} houseId House ID
     * @param {Object} data Data
     * @param {HttpRequest} req
     * @param {Array} data.dates Array of date-price id's
     * @param {Callback} cb
     * @memberOf HouseBookingRequest
     */
    Model.AddRequest = function (houseId, data, req, cb) {
        cb = cb || Common.PromiseCallback();

        async.parallel({
            house: function (callback) {
                app.models.House.findById(houseId).then((house) => {
                    if (!house) return callback(Persistency.Errors.NotFound({message: 'error.persistency.house.not_found'}));
                    if (house.deleted === true) return callback(Persistency.Errors.NotFound({message: 'error.persistency.house.deleted'}));
                    callback(null, house);
                }).catch((e) => {
                    callback(e);
                });
            },
            guest: function (callback) {
                var currentUser = req.getNarengiContext().getCurrentUser();
                if (!currentUser) return callback(Security.Errors.NotAuthorized());

                app.models.Person.GetByAccountId(currentUser.id).then((person) => {
                    if (!person) return callback(Persistency.Errors.NotFound({message: 'error.persistency.person.not_found'}));
                    callback(null, person);
                }).catch((e) => {
                    callback(e);
                });
            }
        }, function (err, result) {
            if (err) return cb(err);

            //we should forbid house owner to book his/her house
            if (result.house.ownerId == result.guest.id) {
                return cb(Common.Errors.GeneralError({message: 'error.house.booking.house_owner_is_requester', statusCode: 403}));
            }
            createRequest(result.house, result.guest, cb);
        });

        return cb.promise;

        /**
         *
         * @param {House} house
         * @param {Person} guest
         * @param {Callback} cb
         */
        function createRequest(house, guest, cb) {
            async.waterfall([
                function (callback) {
                    app.models.HouseDatePrice.find({where: {id: {inq: data.dates}}}, callback);
                }
            ], function (err, dates) {
                if (err) return cb(err);
                if (!lodash.isArray(dates)) return cb(Persistency.Errors.NotFound({message: 'error.persistency.house.dates_not_found'}));

                var obj = {
                    requestDate: moment.utc().toDate(),
                    requesterId: guest.id
                };
                var request = house.bookingRequests.build(obj);
                request.houseSnapshot(house);
                request.bookedDates(dates);

                request.save().then((saved) => {
                    saved.setupStates();
                    async.parallel({
                        houseOwner: function (callback) {
                            async.waterfall([
                                function (wCallback) {
                                    house.owner(wCallback);
                                },
                                function (hOwnerPerson, wCallback) {
                                    if (!hOwnerPerson) return wCallback(Persistency.Errors.NotFound({message: 'error.persistency.house.owner_not_found'}));
                                    hOwnerPerson.account(wCallback);
                                }
                            ], callback);
                        },
                        guest: function (callback) {
                            guest.account(callback);
                        }
                    }, function (err, result) {
                        if (err) return cb(err);

                        var options = {
                            house: house,
                            houseOwner: result.houseOwner,
                            guest: result.guest,
                            cb: function (err, bookRequest) {
                                if (err) return cb(err);
                                cb(null, bookRequest);
                            }
                        };

                        saved.stateMachine.Book(options);
                    });
                }).catch((e) => {
                    cb(e);
                });
            });
        }
    };

    Model.remoteMethod(
        'AddRequest', {
            description: 'Create a new book request.',
            accepts: [
                {
                    arg: 'houseId',
                    type: 'string',
                    required: true,
                    http: {source: 'path'},
                    description: 'ID of the house to be booked'
                },
                {
                    arg: 'data',
                    type: 'object',
                    required: true,
                    http: {source: 'body'},
                    description: 'Data attributes to create new instance'
                },
                {
                    arg: 'req',
                    type: 'object',
                    http: {source: 'req'},
                    description: 'Http request'
                }
            ],
            returns: {
                arg: 'bookRequest',
                type: 'object',
                root: true
            },
            http: {
                path: "/:houseId",
                verb: 'post',
                status: 201
            }
        }
    );

    //=========================================================================

    Model.CancelRequest = function (id, req, cb) {
        cb = cb || Common.PromiseCallback();

        async.parallel({
            request: function (callback) {
                Model.findById(id, callback);
            },
            guest: function (callback) {
                var currentUser = req.getNarengiContext().getCurrentUser();
                if (!currentUser) return callback(Security.Errors.NotAuthorized());

                app.models.Person.GetByAccountId(currentUser.id).then((person) => {
                    if (!person) return callback(Persistency.Errors.NotFound({message: 'error.persistency.person.not_found'}));
                    callback(null, person);
                }).catch((e) => {
                    callback(e);
                });
            }
        }, function (err, result) {
            if (err) return cb(err);
            var {request, guest} = result;
            if (!request) {
                return cb(Persistency.Errors.NotFound({message: 'error.house.booking.request_not_found'}));
            }

            if (request.requesterId !== guest.id) {
                return cb(Common.Errors.GeneralError({message: 'error.house.booking.not_owner', statusCode: 403}));
            }

            request.setupStates();

            cancelRequest(request, guest, cb);
        });

        return cb.promise;

    };

    Model.remoteMethod(
        'CancelRequest', {
            description: 'Guest cancels his/her request',
            accepts: [
                {
                    arg: 'id',
                    type: 'string',
                    required: true,
                    http: {source: 'path'},
                    description: 'ID of the house booking request '
                },
                {
                    arg: 'req',
                    type: 'object',
                    http: {source: 'req'},
                    description: 'Http request'
                }
            ],
            returns: {
                arg: 'bookRequest',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id/cancel",
                verb: 'put',
                status: 201
            }
        }
    );

    //=========================================================================

    Model.RejectRequest = function (id, req, cb) {
        cb = cb || Common.PromiseCallback();

        async.parallel({
            request: function (callback) {
                Model.findById(id, callback);
            },
            houseOwnerPerson: function (callback) {
                var currentUser = req.getNarengiContext().getCurrentUser();
                if (!currentUser) return callback(Security.Errors.NotAuthorized());

                app.models.Person.GetByAccountId(currentUser.id).then((person) => {
                    if (!person) return callback(Persistency.Errors.NotFound({message: 'error.persistency.person.not_found'}));
                    callback(null, person);
                }).catch((e) => {
                    callback(e);
                });
            }
        }, function (err, result) {
            if (err) return cb(err);
            var {request, houseOwnerPerson} = result;
            if (!request) {
                return cb(Persistency.Errors.NotFound({message: 'error.house.booking.request_not_found'}));
            }

            if (houseOwnerPerson.id !== request.houseSnapshot.value().ownerId) {
                return cb(Common.Errors.GeneralError({message: 'error.house.booking.not_owner', statusCode: 403}));
            }

            request.setupStates();

            rejectRequest(request, houseOwnerPerson, cb);
        });

        return cb.promise;

    };

    Model.remoteMethod(
        'RejectRequest', {
            description: 'House owner rejects the request',
            accepts: [
                {
                    arg: 'id',
                    type: 'string',
                    required: true,
                    http: {source: 'path'},
                    description: 'ID of the house booking request '
                },
                {
                    arg: 'req',
                    type: 'object',
                    http: {source: 'req'},
                    description: 'Http request'
                }
            ],
            returns: {
                arg: 'bookRequest',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id/reject",
                verb: 'put',
                status: 201
            }
        }
    );

    //=========================================================================

    //TODO this service should be done after payment module
    Model.PayForRequest = function (id, req, cb) {
        cb = cb || Common.PromiseCallback();


        return cb.promise;

    };

    //TODO check if this remote method should be existed or not
    Model.remoteMethod(
        'PayForRequest', {
            description: 'House owner rejects the request',
            accepts: [
                {
                    arg: 'id',
                    type: 'string',
                    required: true,
                    http: {source: 'path'},
                    description: 'ID of the house booking request '
                },
                {
                    arg: 'req',
                    type: 'object',
                    http: {source: 'req'},
                    description: 'Http request'
                }
            ],
            returns: {
                arg: 'bookRequest',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id/paid",
                verb: 'put',
                status: 201
            }
        }
    );

    //=========================================================================

    Model.ConfirmRequest = function (id, data, req, cb) {
        cb = cb || Common.PromiseCallback();

        async.parallel({
            request: function (callback) {
                Model.findById(id, callback);
            },
            houseOwnerPerson: function (callback) {
                var currentUser = req.getNarengiContext().getCurrentUser();
                if (!currentUser) return callback(Security.Errors.NotAuthorized());

                app.models.Person.GetByAccountId(currentUser.id).then((person) => {
                    if (!person) return callback(Persistency.Errors.NotFound({message: 'error.persistency.person.not_found'}));
                    callback(null, person);
                }).catch((e) => {
                    callback(e);
                });
            }
        }, function (err, result) {
            if (err) return cb(err);
            var {request, houseOwnerPerson} = result;
            if (!request) {
                return cb(Persistency.Errors.NotFound({message: 'error.house.booking.request_not_found'}));
            }

            if (houseOwnerPerson.id !== request.houseSnapshot.value().ownerId) {
                return cb(Common.Errors.GeneralError({message: 'error.house.booking.not_owner', statusCode: 403}));
            }

            request.setupStates();

            if (request.securityCode !== data.securityCode) {
                return cb(Common.Errors.GeneralError({message: 'error.house.booking.confirm.wrong_code', statusCode: 400}));
            }

            confirmRequest(request, houseOwnerPerson, data.securityCode, cb);
        });

        return cb.promise;
    };

    Model.remoteMethod(
        'ConfirmRequest', {
            description: 'House owner confirms the request',
            accepts: [
                {
                    arg: 'id',
                    type: 'string',
                    required: true,
                    http: {source: 'path'},
                    description: 'ID of the house booking request '
                },
                {
                    arg: 'data',
                    type: 'object',
                    required: true,
                    http: {source: 'body'},
                    description: ['Data attributes :\n',
                        ' {String} `data.securityCode` ']
                },
                {
                    arg: 'req',
                    type: 'object',
                    http: {source: 'req'},
                    description: 'Http request'
                }
            ],
            returns: {
                arg: 'bookRequest',
                type: 'object',
                root: true
            },
            http: {
                path: "/:id/confirm",
                verb: 'put',
                status: 201
            }
        }
    );

    //=========================================================================

    Model.Settle = function (id, req, cb) {
        cb = cb || Common.PromiseCallback();

        async.parallel({
            request: function (callback) {
                Model.findById(id, callback);
            },
            actor: function (callback) {
                var currentUser = req.getNarengiContext().getCurrentUser();
                if (!currentUser) return callback(Security.Errors.NotAuthorized());

                app.models.Person.GetByAccountId(currentUser.id).then((person) => {
                    if (!person) return callback(Persistency.Errors.NotFound({message: 'error.persistency.person.not_found'}));
                    callback(null, person);
                }).catch((e) => {
                    callback(e);
                });
            }
        }, function (err, result) {
            if (err) return cb(err);
            var {request, actor, houseOwnerPerson} = result;
            if (!request) {
                return cb(Persistency.Errors.NotFound({message: 'error.house.booking.request_not_found'}));
            }

            request.setupStates();

            settlement(request, actor, cb);
        });

        return cb.promise;
    };

    //=========================================================================

    Model.GetAliveRequestsOfGuest = function (req, params, cb) {
        cb = cb || Common.PromiseCallback();

        var currentUser = req.getNarengiContext().getCurrentUser();
        if (!currentUser) return callback(Security.Errors.NotAuthorized());

        async.waterfall([
            function (callback) {
                app.models.Person.GetByAccountId(currentUser.id, callback);
            }
        ], function (err, guestPerson) {
            if (err) return cb(err);
            if (!guestPerson) return cb(Persistency.Errors.NotFound({message: 'error.house.booking.person_not_found'}));

            Model.Alive({
                where: {requesterId: guestPerson.id}
            }, cb);
        });

        return cb.promise;
    };

    Model.remoteMethod(
        'GetAliveRequestsOfGuest', {
            description: 'Returns requests of guest (considering current user is guest)',
            accepts: [
                {
                    arg: 'req',
                    type: 'object',
                    http: {source: 'req'},
                    description: 'Http request'
                },
                {
                    arg: 'params',
                    type: 'object',
                    http: Http.Params.QueryParams,
                    description: ['Query params eg `?by=house` converts to `{by: "house"}`\n',
                        'Allowed params is : `by=house` or nothing\n',
                        '`by=house` returns the result based on each house\n',
                        'and nothing return the `HouseBookingRequest` results']
                }
            ],
            returns: {
                arg: 'bookRequest',
                type: 'array',
                root: true
            },
            http: {
                path: "/guest",
                verb: 'get',
                status: 200
            }
        }
    );

    //=========================================================================

    Model.GetAliveRequestsOfHost = function (req, params, cb) {
        cb = cb || Common.PromiseCallback();

        var currentUser = req.getNarengiContext().getCurrentUser();
        if (!currentUser) return callback(Security.Errors.NotAuthorized());

        async.parallel({
            hostAccount: function (callback) {
                app.models.Account.GetById(currentUser.id, callback);
            },
            hostPerson: function (callback) {
                async.waterfall([
                    function (wCb) {
                        app.models.Person.GetByAccountId(currentUser.id, wCb);
                    }
                ], function (err, hostPerson) {
                    if (err) return callback(err);
                    if (!hostPerson) return callback(Persistency.Errors.NotFound({message: 'error.house.booking.person_not_found'}));
                    callback(null, hostPerson);
                });
            }
        }, function (err, result) {
            if (err) return cb(err);

            Model.Alive({
                where: {'house_snapshot.ownerId': result.hostPerson.id},
                include: {
                    relation: 'owner',
                    scope: {
                        include: {relation: 'account'}
                    }
                },
                order: 'requestDate DESC'
            }, transform(result.hostPerson, result.hostAccount));
        });

        return cb.promise;

        function transform(person, account) {
            return function (err, result) {
                if (err) return cb(err);
                var mapped = lodash.map(result, function (item) {
                    return {
                        houseId: item.houseId.toString(),
                        request: item
                    };
                });

                var reduced = lodash.reduce(mapped, function (result, item) {
                    (result[item.houseId] || (result[item.houseId] = [])).push(item.request);
                    return result;
                }, {});

                var arr = [];
                lodash.forEach(reduced, function (requests, houseId) {
                    var obj = {
                        house: {},
                        requests: null
                    };
                    obj.house.id = houseId;
                    obj.house.detailUrl = requests[0].houseSnapshot.getDetailUrl();
                    obj.house.type = requests[0].houseSnapshot.type;
                    obj.house.name = requests[0].houseSnapshot.name;
                    obj.house.location = requests[0].houseSnapshot.location;

                    var reqObjects = lodash.map(requests, function (request) {
                        var reqObj = {
                            guest: {}
                        };
                        reqObj.state = request.state;
                        reqObj.requestDate = request.requestDate;
                        reqObj.dates = request.bookedDates.value();

                        reqObj.guest.name = request.owner().account().DisplayName;
                        reqObj.guest.location = request.owner().account().profile.value().location;
                        reqObj.guest.detailUrl = request.owner().account().getProfileDetailUrl();

                        return reqObj;
                    });

                    obj.requests = reqObjects;
                    arr.push(obj);
                });
                ctx.result = arr;
                next();
            };
        }
    };

    Model.remoteMethod(
        'GetAliveRequestsOfHost', {
            description: 'Returns requests of host (considering current user is host)',
            accepts: [
                {
                    arg: 'req',
                    type: 'object',
                    http: {source: 'req'},
                    description: 'Http request'
                },
                {
                    arg: 'params',
                    type: 'object',
                    http: Http.Params.QueryParams,
                    description: ['Query params eg `?by=house` converts to `{by: "house"}`\n',
                        'Allowed params is : `by=house` or nothing\n',
                        '`by=house` returns the result based on each house\n',
                        'and nothing return the `HouseBookingRequest` results']
                }
            ],
            returns: {
                arg: 'bookRequest',
                type: 'array',
                root: true
            },
            http: {
                path: "/host",
                verb: 'get',
                status: 200
            }
        }
    );
}

function cancelRequest(request, guest, cb) {

    async.parallel({
        houseOwner: function (callback) {
            app.models.Account.findById(request.houseSnapshot.value().id, callback);
        },
        guestAccount: function (callback) {
            guest.account(callback);
        }
    }, function (err, result) {
        if (err) return cb(err);

        var {houseOwner, guestAccount} = result;
        if (!houseOwner) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.house_owner_not_found'}));
        }
        if (!guestAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.guest_account_not_found'}));
        }

        request.stateMachine.cancel(houseOwner, guestAccount, cb);
    });
}

function rejectRequest(request, houseOwnerPerson, cb) {
    async.parallel({
        houseOwnerAccount: function (callback) {
            houseOwnerPerson.account(callback);
        },
        guestAccount: function (callback) {
            async.waterfall([
                function (wCallback) {
                    request.owner(wCallback);
                },
                function (guestPerson, wCallback) {
                    if (!guestPerson) return wCallback(Persistency.Errors.NotFound({message: 'error.house.booking.guest_account_not_found'}));
                    guestPerson.account(wCallback);
                }
            ], function (err, result) {
                if (err) return callback(err);
                callback(null, result);
            });
        }
    }, function (err, result) {
        if (err) return cb(err);

        var {houseOwnerAccount, guestAccount} = result;
        if (!houseOwnerAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.house_owner_not_found'}));
        }
        if (!houseOwnerAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.guest_account_not_found'}));
        }

        request.stateMachine.reject(houseOwnerAccount, guestAccount, cb);
    });
}

function confirmRequest(request, houseOwnerPerson, securityCode, cb) {
    async.parallel({
        houseOwnerAccount: function (callback) {
            houseOwnerPerson.account(callback);
        },
        guestAccount: function (callback) {
            async.waterfall([
                function (wCallback) {
                    request.owner(wCallback);
                },
                function (guestPerson, wCallback) {
                    if (!guestPerson) return wCallback(Persistency.Errors.NotFound({message: 'error.house.booking.guest_account_not_found'}));
                    guestPerson.account(wCallback);
                }
            ], function (err, result) {
                if (err) return callback(err);
                callback(null, result);
            });
        }
    }, function (err, result) {
        if (err) return cb(err);

        var {houseOwnerAccount, guestAccount} = result;
        if (!houseOwnerAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.house_owner_not_found'}));
        }
        if (!guestAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.guest_account_not_found'}));
        }

        request.stateMachine.confirm(houseOwnerAccount, guestAccount, securityCode, cb);
    });
}

function settlement(request, actor, cb) {
    async.parallel({
        houseOwnerAccount: function (callback) {
            async.waterfall([
                function (wCallback) {
                    request.houseSnapshot.value().owner(wCallback);
                },
                function (houseOwnerPerson, wCallback) {
                    if (!houseOwnerPerson) return wCallback(Persistency.Errors.NotFound({message: 'error.house.booking.house-owner_not_found'}));
                    houseOwnerPerson.account(wCallback);
                }
            ], function (err, result) {
                if (err) return callback(err);
                callback(null, result);
            });
            houseOwnerPerson.account(callback);
        },
        actorAccount: function (callback) {
            actor.account(callback);
        },
        guestAccount: function (callback) {
            async.waterfall([
                function (wCallback) {
                    request.owner(wCallback);
                },
                function (guestPerson, wCallback) {
                    if (!guestPerson) return wCallback(Persistency.Errors.NotFound({message: 'error.house.booking.guest_account_not_found'}));
                    guestPerson.account(wCallback);
                }
            ], function (err, result) {
                if (err) return callback(err);
                callback(null, result);
            });
        }
    }, function (err, result) {
        if (err) return cb(err);

        var {actorAccount, guestAccount, houseOwnerAccount} = result;
        if (!actorAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.actor_not_found'}));
        }
        if (!houseOwnerAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.house_owner_not_found'}));
        }
        if (!guestAccount) {
            return cb(Persistency.Errors.NotFound({message: 'error.house.booking.guest_account_not_found'}));
        }

        request.stateMachine.settlement(actorAccount, houseOwnerAccount, guestAccount, cb);
    });
}

function setupStateMachine(Model) {

    //NOTE that all business logic of the booking are done in this class

    /**
     * Handles all lifecycle of a book request.
     * Actually this is a finite state machine.
     * @class RequestState
     * @memberOf HouseBookingRequest
     */
    class RequestState {
        constructor(bookRequest) {
            this.bookRequest = bookRequest;
        }

        //NOTE that we have to use `onbeforeX` hook, because we have some async operations which should be done in these hooks
        //And just `onbeforeX` has this functionality

        //action "Book" causes

        /**
         *
         * @param {String} event
         * @param {String} from
         * @param {String} to
         * @param {Object} options
         * @param {House} options.house
         * @param {Account} options.houseOwner
         * @param {Account} options.guest
         * @param {Callback} options.cb
         * @returns {string}
         */
        onleaveNONE(event, from, to, options) {
            var self = this;

            var {house, houseOwner, guest, cb} = options;

            /**
             * 1) Send email to host denoting a guest issues a book request
             * 2) Send sms to host denoting a guest issues a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'ISSUED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestIssuedToHost(houseOwner.email, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestIssuedToHost(houseOwner.cellNumber, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, event, from, to).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {String} event
         * @param {String} from
         * @param {String} to
         * @param {Object} options
         * @param {Account} options.houseOwner
         * @param {Account} options.guest
         * @param {Callback} options.cb
         * @returns {String}
         */
        onleaveISSUED(event, from, to, options) {
            var {houseOwner, guest, cb}  = options;
            switch (event) {
                case 'CancelIssued':
                    return this.doCancelIssued(houseOwner, guest, cb);
                    break;
                case 'RejectIssued':
                    return this.doRejectIssued(houseOwner, guest, cb);
                    break;
                case 'Accept':
                    return this.doAccept(houseOwner, guest, cb);
                    break;
                default:
                    break;
            }
            //illegal . should not happen
            cb(Common.Errors.GeneralError({message: 'error.house.booking.illegal_situation', statusCode: 500}));
        }

        /**
         *
         * @param {String} event
         * @param {String} from
         * @param {String} to
         * @param {Object} options
         * @param {Account} options.houseOwner
         * @param {Account} options.guest
         * @param {Callback} options.cb
         * @returns {String}
         */
        onleaveACCEPTED(event, from, to, options) {
            var {houseOwner, guest, cb} = options;
            switch (event) {
                case 'CancelAccepted':
                    return this.doCancelAccepted(houseOwner, guest, cb);
                    break;
                case 'RejectAccepted':
                    return this.doRejectAccepted(houseOwner, guest, cb);
                    break;
                case 'Pay':
                    return this.doPay(houseOwner, guest, cb);
                    break;
                default:
                    break;
            }
            //illegal . should not happen
            cb(Common.Errors.GeneralError({message: 'error.house.booking.illegal_situation', statusCode: 500}));
        }

        /**
         *
         * @param {String} event
         * @param {String} from
         * @param {String} to
         * @param {Object} options
         * @param {Account} options.houseOwner
         * @param {Account} options.guest
         * @param {String} options.securityCode (OPTIONAL)
         * @param {Callback} options.cb
         * @returns {String}
         */
        onleavePAID(event, from, to, options) {
            var {houseOwner, guest, cb} = options;
            switch (event) {
                case 'CancelPaid':
                    return this.doCancelPaid(houseOwner, guest, cb);
                    break;
                case 'RejectPaid':
                    return this.doRejectPaid(houseOwner, guest, cb);
                    break;
                case 'Confirm':
                    return this.doConfirm(houseOwner, guest, options.securityCode, cb);
                    break;
                default:
                    break;
            }
            //illegal . should not happen
            cb(Common.Errors.GeneralError({message: 'error.house.booking.illegal_situation', statusCode: 500}));
        }

        /**
         *
         * @param {String} event
         * @param {String} from
         * @param {String} to
         * @param {Object} options
         * @param {Account} options.actor
         * @param {Account} options.houseOwner
         * @param {Account} options.guest
         * @param {Callback} options.cb
         * @returns {String}
         */
        onleaveCONFIRMED(event, from, to, options) {
            return this.doSettle(options.actor, options.houseOwner, options.guest, options.cb);
        }

        // business methods

        /**
         * Cancels a request. Decides based on current state
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         */
        cancel(houseOwner, guest, cb) {
            switch (this.current) {
                case 'ISSUED':
                    return this.CancelIssued({houseOwner: houseOwner, guest: guest, cb: cb});
                    break;
                case 'ACCEPTED':
                    return this.CancelAccepted({houseOwner: houseOwner, guest: guest, cb: cb});
                    break;
                case 'PAID':
                    return this.CancelPaid({houseOwner: houseOwner, guest: guest, cb: cb});
                    break;
                default:
                    break;
            }
            return cb(Common.Errors.GeneralError({message: 'error.house.booking.cancel_not_allowed_by_state', statusCode: 403}));
        }

        /**
         * House owner rejects the request
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         */
        reject(houseOwner, guest, cb) {
            switch (this.current) {
                case 'ISSUED':
                    return this.RejectIssued({houseOwner: houseOwner, guest: guest, cb: cb});
                    break;
                case 'ACCEPTED':
                    return this.RejectAccepted({houseOwner: houseOwner, guest: guest, cb: cb});
                    break;
                case 'PAID':
                    return this.RejectPaid({houseOwner: houseOwner, guest: guest, cb: cb});
                    break;
                default:
                    break;
            }
            return cb(Common.Errors.GeneralError({message: 'error.house.booking.cancel_not_allowed_by_state', statusCode: 403}));
        }

        /**
         * House owner confirms the request
         * @param {Account} houseOwnerAccount
         * @param {Account} guestAccount
         * @param {String} securityCode
         * @param {Callback} cb
         */
        confirm(houseOwnerAccount, guestAccount, securityCode, cb) {
            if (this.current === 'PAID') {
                return this.Confirm({houseOwner: houseOwnerAccount, guest: guestAccount, securityCode: securityCode, cb: cb});
            }
            return cb(Common.Errors.GeneralError({message: 'error.house.booking.cancel_not_allowed_by_state', statusCode: 403}));
        }

        /**
         *
         * @param {Account} actorAccount eg admin
         * @param {Account} houseOwnerAccount
         * @param {Account} guestAccount
         * @param {Callback} cb
         */
        settlement(actorAccount, houseOwnerAccount, guestAccount, cb) {
            if (this.current === 'CONFIRMED') {
                return this.Settle({actor: actorAccount, houseOwner: houseOwnerAccount, guest: guestAccount, cb: cb});
            }
            return cb(Common.Errors.GeneralError({message: 'error.house.booking.cancel_not_allowed_by_state', statusCode: 403}));
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doCancelIssued(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a guest cancels a book request
             * 2) Send sms to host denoting a guest cancels a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'CANCELED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestCanceledToHost(houseOwner.email, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestCanceledToHost(houseOwner.cellNumber, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'CancelIssued', 'ISSUED', 'CANCELED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doRejectIssued(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a house owner rejects a book request
             * 2) Send sms to host denoting a house owner rejects a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'REJECTED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: houseOwner.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestRejectedToGuest(guest.email, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestRejectedToGuest(guest.cellNumber, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'RejectIssued', 'ISSUED', 'REJECTED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doAccept(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a house owner accepts a book request
             * 2) Send sms to host denoting a house owner accepts a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'ACCEPTED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: houseOwner.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestAcceptedToGuest(guest.email, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestAcceptedToGuest(guest.cellNumber, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'Accept', 'ISSUED', 'ACCEPTED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doCancelAccepted(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a guest cancels a book request
             * 2) Send sms to host denoting a guest cancels a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'CANCELED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestCanceledToHost(houseOwner.email, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestCanceledToHost(houseOwner.cellNumber, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'CancelAccepted', 'ACCEPTED', 'CANCELED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doRejectAccepted(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a house owner rejects a book request
             * 2) Send sms to host denoting a house owner rejects a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'ISSUED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: houseOwner.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestRejectAcceptedToGuest(guest.email, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestRejectAcceptedToGuest(guest.cellNumber, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'RejectAccepted', 'ACCEPTED', 'ISSUED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doPay(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a house owner accepts a book request
             * 2) Send sms to host denoting a house owner accepts a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttributes({
                        state: 'PAID',
                        securityCode: require('randomstring').generate({length: 6, charset: 'numeric'})
                    }, callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: houseOwner.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestAcceptedToGuest(guest.email, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestAcceptedToGuest(guest.cellNumber, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'Pay', 'ACCEPTED', 'PAID').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doCancelPaid(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a guest cancels a book request
             * 2) Send sms to host denoting a guest cancels a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'CANCELED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestCanceledToHost(houseOwner.email, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestCanceledToHost(houseOwner.cellNumber, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'CancelPaid', 'PAID', 'CANCELED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doRejectPaid(houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a house owner rejects a book request
             * 2) Send sms to host denoting a house owner rejects a book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttribute('state', 'ISSUED', callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: houseOwner.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestRejectPaidToGuest(guest.email, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestRejectPaidToGuest(guest.cellNumber, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'RejectPaid', 'PAID', 'ISSUED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {String} securityCode (entered by house owner)
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doConfirm(houseOwner, guest, securityCode, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting a house owner confirms the book request
             * 2) Send sms to host denoting a house owner confirms the book request
             * 3) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttributes({
                        state: 'CONFIRMED'
                    }, callback);
                },
                email: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: houseOwner.DisplayName
                    };
                    app.models.Notification.SendEmailBookRequestConfirmToGuest(guest.email, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                sms: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBookRequestConfirmToGuest(guest.cellNumber, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'Confirm', 'PAID', 'CONFIRMED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }

        /**
         *
         * @param {Account} actor
         * @param {Account} houseOwner
         * @param {Account} guest
         * @param {Callback} cb
         * @memberOf HouseBookingRequest.RequestState
         * @private
         */
        doSettle(actor, houseOwner, guest, cb) {
            var self = this;
            var house = this.houseSnapshot.value();

            /**
             * 1) Send email to host denoting payment settled to guest
             * 2) Send sms to host denoting payment settled to guest
             * 3) Send email to guest denoting payment settled to guest
             * 4) Send sms to guest denoting payment settled to guest
             * 5) Persist log of book request process
             *
             * The result of this event callback is the book request passed in
             */

            async.parallel({
                request: function (callback) {
                    self.bookRequest.updateAttributes({
                        state: 'SETTLED'
                    }, callback);
                },
                emailToGuest: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: houseOwner.DisplayName
                    };
                    app.models.Notification.SendEmailBokRequestSettlementToGuest(guest.email, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                smsToGuest: function (callback) {
                    var locals = {
                        displayName: guest.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBokRequestSettlementToGuest(guest.cellNumber, guest, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                emailToHost: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendEmailBokRequestSettlementToHost(houseOwner.email, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                smsToHost: function (callback) {
                    var locals = {
                        displayName: houseOwner.DisplayName,
                        houseName: house.name,
                        guestName: guest.DisplayName
                    };
                    app.models.Notification.SendSMSBokRequestSettlementToHost(houseOwner.cellNumber, houseOwner, locals).then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                },
                eventPersistency: function (callback) {
                    app.models.HouseBookingRequestMQPersister.Persist(self.bookRequest, 'Settle', 'CONFIRMED', 'SETTLED').then((res) => {
                        callback(null, res);
                    }).catch((e) => {
                        callback(null, null);
                    });
                }
            }, function (err, result) {
                if (err) {
                    cb(err);
                    self.transition();
                    return;
                }
                cb(null, result.request);
                self.transition();
            });

            return StateMachine.ASYNC;
        }
    }

    Model.prototype.setupStates = function () {
        var reqState = new RequestState(this);
        var self = this;
        var sm = StateMachine.create({
            target: reqState,
            initial: self.state,
            events: [
                {name: 'Book', from: 'NONE', to: 'ISSUED'},
                {name: 'CancelIssued', from: 'ISSUED', to: 'CANCELED'},
                {name: 'RejectIssued', from: 'ISSUED', to: 'REJECTED'},
                {name: 'Accept', from: 'ISSUED', to: 'ACCEPTED'},
                {name: 'CancelAccepted', from: 'ACCEPTED', to: 'CANCELED'},
                {name: 'RejectAccepted', from: 'ACCEPTED', to: 'ISSUED'},
                {name: 'Pay', from: 'ACCEPTED', to: 'PAID'},
                {name: 'CancelPaid', from: 'PAID', to: 'CANCELED'},
                {name: 'RejectPaid', from: 'PAID', to: 'ISSUED'},
                {name: 'Confirm', from: 'PAID', to: 'CONFIRMED'},
                {name: 'Settle', from: 'CONFIRMED', to: 'SETTLED'}
            ],
            error: function (eventName, from, to, args, errorCode, errorMessage) {
                //TODO: Handle errors
            }
        });
        this.stateMachine = sm;
    };
}