//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

const Common = require('narengi-utils').Common,
    Pagination = require('narengi-utils').Pagination,
    Persistency = require('narengi-utils').Persistency,
    app = serverRequire('server'),
    underscore = require('underscore'),
    lodash = require('lodash'),
    loopback = require('loopback'),
    LoopBackContext = require('loopback-context'),
    randomString = require('randomstring'),
    async = require('async'),
    debug = require('debug')('narengi-house'),
    moment = require('moment'),
    ObjectID = require('mongodb').ObjectID,
    _ = require('lodash');

/**
 * @namespace Models.House
 * @module House
 */
module.exports = function(House) {
    House.setMaxListeners(50); //prevent from warning. Because this class has a lot of remote hooks, warning raised 

    defineInstanceServices(House);
    defineMainServices(House);
    definePictureStuff(House);
    defineFeatureStuff(House);
    defineExtraServicesStuff(House);
    defineHouseTypeServiceStuff(House);
    defineHouseStatusServiceStuff(House);
    defineHouseSpecServiceStuff(House);
    defineAvailableDateServiceStuff(House);
    definePriceDateServiceStuff(House);
    definePriceProfileServiceStuff(House);
    defineCancellationPolicyServiceStuff(House);
};

/**
 * @param {HttpRequest} req
 * @param houseId
 * @param data
 * @param cb
 * @return {*}
 * @ignore
 */
function createOrUpdateHouse(req, houseId, data, cb) {
    var plainProps = [
        'name',
        'summary',
        'location',
        'position',
        'housetype',
        'spec',
        'price',
        'prices',
        'features',
        'feature_list',
        'available_dates',
        'lang'
    ];
    // validate Data
    var plainData = underscore.pick(data, plainProps);
    // console.log('update-house-plain-data', plainData);

    async.waterfall([
        function(callback) { //create or update instance by plain properties
            if (houseId !== null) {
                plainData.id = houseId;
            }
            app.models.House.upsert(plainData, callback);
        },
        function(house, callback) { //set owner
            if (houseId == null) {
                setOwner(callback, req)(house);
            } else {
                callback(null, house);
            }
        },
        function(house, callback) { //set house type.
            if (plainData.housetype) {
                app.models.HouseType
                    .findOne({
                        where: {
                            key: plainData.housetype
                        }
                    })
                    .then(function(type) {
                        house.houseType(type);
                        callback(null, house);
                    })
                    .catch(function(err) {
                        callback(null, house);
                    });
                    // HouseBookingRequest
            } else {
                callback(null, house);
            }
        },
        function(house, callback) { //set spec
            if (plainData.spec) {
                var spec = app.models.HouseSpec.RefineInput(plainData.spec);
                house.spec = house.spec || {};
                spec = underscore.defaults(spec, house.spec.toJSON());
                lodash.keys(spec).map(function(s) {
                    if (!Boolean(Number(spec[s]))) spec[s] = 0;
                });
                house.spec = spec;
            }
            callback(null, house);
        },
        function(house, callback) { //set price
            if (plainData.price || plainData.prices) {
                let priceData = plainData.price || plainData.prices;
                var price = app.models.HousePriceProfile.RefineInput(priceData);
                house.prices = house.prices || {};
                price = underscore.defaults(price, house.prices);
                house.prices = price;
            }
            callback(null, house);
        },
        function(house, callback) {
            if (plainData.feature_list) {
                app.models.HouseFeature
                    .find({})
                    .then(function(features) {
                        var selected = [];
                        plainData.feature_list.map(function(feature) {
                            var f = lodash.find(features, {
                                key: feature
                            })
                            if (f) selected.push(f);
                        })
                        house.features = house.features || {};
                        selected = underscore.defaults(selected, house.features);
                        house.features = selected;
                        callback(null, house);
                    })
                    .catch(function(err) {
                        callback(err);
                    })
            } else {
                callback(null, house);
            }
        },
        function(house, callback) {
            if (plainData.available_dates) {
                house.dates = plainData.available_dates;
            }
            callback(null, house);
        }
    ], function(err, house) {
        if (err) return cb(err);
        // console.log('NEW HOUSE WILL BE SAVE!', house);
        house.save(cb);
    });

    return cb.promise;
}

/**
 * Set owner of house based on current logged in user
 * @param {Callback} cb
 * @param {HttpRequest} req
 * @ignore
 */
function setOwner(cb, req) {
    return function(house) {
        if (!house)
            return cb(Persistency.Errors.NotFound());

        var loopbackCtx = req.getNarengiContext();
        var currentUser = loopbackCtx && loopbackCtx.getUser();
        if (currentUser) {
            app.models.Person.GetByAccountId(currentUser.id).then(personFoundHandler(house, cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        } else
            Persistency.CrudHandlers.successHandler(cb)(house);
    };

    function personFoundHandler(house, callback) {
        return function(person) {
            house.owner(person);
            //house.save().then(Persistency.CrudHandlers.successHandler(callback)).catch(Persistency.CrudHandlers.failureHandler(callback));
            callback(null, house);
        }
    }
}

function defineInstanceServices(House) {
    /**
     * Is the current user can book
     * @memberOf House
     */
    House.prototype.canBook = function(id, req, cb) {

    };
}

function defineMainServices(House) {

    /**
     * Creates a new `House` instance.
     * @param {Object} data User input data
     * @param {String} data.name
     * @param {Object} data.location
     * @param {Object} data.location.point
     * @param {Number} data.location.point.latitude
     * @param {Number} data.location.point.longitude
     * @param {String} data.location.province
     * @param {String} data.location.city
     * @param {String} data.summary
     * @param {String} data.description
     * @param {Object} data.spec
     * @param {Number} data.spec.accommodate
     * @param {Number} data.spec.bedroom
     * @param {Number} data.spec.bed
     * @param {Number} data.spec.bathroom
     * @param {String} data.type_id
     * @param {Array} data.features
     * @param {HttpRequest} req
     * @param {Callback} cb
     * @returns {HouseDTO}
     */
    House.Create = function(data, req, cb) {
        cb = cb || Common.PromiseCallback();
        return createOrUpdateHouse(req, null, data, cb);
    };

    House.beforeRemote('Create', Common.RemoteHooks.correctCaseOfKeysInArg('data', true));
    House.beforeRemote('Create', Common.RemoteHooks.injectLangToRequestData);
    House.afterRemote('Create', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod(
        'Create', {
            description: 'Creates a house.',
            accepts: [{
                arg: 'data',
                type: 'object',
                required: true,
                http: { source: 'body' },
                description: 'Data attributes to create new instance'
            }, {
                arg: 'req',
                type: 'object',
                required: true,
                http: { source: 'req' }
            }],
            returns: {
                arg: 'house',
                type: 'object',
                root: true
            },
            http: {
                path: '/',
                verb: 'post',
                status: 201
            }
        }
    );

    //===================================================================================================================

    /**
     * Updates a `House` instance.
     * @param {String} id House id
     * @param {Object} data User input data
     * @param {HttpRequest} req
     * @param {String} data.name
     * @param {Object} data.location
     * @param {Object} data.location.point
     * @param {Number} data.location.point.latitude
     * @param {Number} data.location.point.longitude
     * @param {String} data.location.province
     * @param {String} data.location.city
     * @param {String} data.summary
     * @param {String} data.description
     * @param {Object} data.spec
     * @param {Number} data.spec.accommodate
     * @param {Number} data.spec.bedroom
     * @param {Number} data.spec.bed
     * @param {Number} data.spec.bathroom
     * @param {String} data.type_id
     * @param {Array} data.features
     * @param {Callback} cb
     * @returns {HouseDTO}
     */
    House.Update = function(id, data, req, cb) {
        cb = cb || Common.PromiseCallback();
        _.mapKeys(data, _.method('toLowerCase'));
        debug('update-data:', data);    
        return createOrUpdateHouse(req, id, data, cb);
    };

    House.beforeRemote('Update', Common.RemoteHooks.correctCaseOfKeysInArg('data', true));
    House.beforeRemote('Update', Common.RemoteHooks.injectLangToRequestData);
    House.afterRemote('Update', Common.RemoteHooks.convert2Dto(House));
    House.afterRemote('Update', function(ctx, instance, next) {
        let result = ctx.result;
        if (result.prices) {
            result.price = Number(result.prices.price) > 0 ? `${result.prices.price} هزار تومان` : `رایگان`;
        }
        ctx.result = result;
        next();
    });
    House.afterRemote('Update', function(ctx, instance, next) {
        let result = ctx.result;
        async.waterfall([
            (callback) => {
                app.models.Media.find({
                    where: {
                        assign_type: 'house',
                        assign_id: ObjectID(result.id),
                        is_private: false,
                        deleted: false
                    },
                    fields: ['uid'],
                    limit: 10
                }).then((medias) => {
                    let pics = [];
                    _.each(medias, (media) => {
                        pics.push({
                            uid: media.uid,
                            url: `/medias/get/${media.uid}`
                        })
                    })
                    callback(null, pics);
                })
            }
        ], (err, pics) => {
            result.pictures = pics;
            ctx.result = result;
            next();
        })
    });

    House.remoteMethod(
        'Update', {
            description: 'Updates a house.',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }, {
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                }
            }, {
                arg: 'req',
                type: 'object',
                required: true,
                http: {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'house',
                type: 'object',
                root: true
            },
            http: {
                path: '/:id',
                verb: 'put',
                status: 201
            }
        }
    );

    //===================================================================================================================

    /**
     * Deletes a `House` by its id
     * @param {string} id
     * @param {Callback} cb
     */
    House.DeleteOne = function(id, cb) {
        cb = cb || Common.PromiseCallback();

        House.upsert({ id: id, deleted: true }, cb);

        return cb.promise;
    };

    House.remoteMethod(
        'DeleteOne', {
            description: 'Deletes a house.',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            http: {
                path: '/:id',
                verb: 'delete',
                status: 204
            }
        }
    );

    //===================================================================================================================

    /**
     * Fetch a `House` by its id
     * @param {string} id
     * @param {Callback} cb
     * @returns {HouseDTO}
     */
    House.GetById = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(id)
            .then((house) => {
                if (house) {
                    return cb(null, house);
                }
                cb(Persistency.Errors.NotFound());
            })
            .catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.afterRemote('GetById', Common.RemoteHooks.convert2Dto(House));
    House.afterRemote('GetById', function(ctx, instance, next) {
        let result = ctx.result;
        if (result.prices) {
            result.price = Number(result.prices.price) > 0 ? `${result.prices.price} هزار تومان` : `رایگان`;
        }
        // add icon to features
        if (result.features && result.features.length) {
            _.map(result.features, (feature) => {
                feature.icon = `/medias/feature/${feature.key}`;
            })
        }
        ctx.result = result;
        next();
    });
    House.afterRemote('GetById', function(ctx, instance, next) {
        let result = ctx.result;
        async.waterfall([
            (callback) => {
                app.models.Media.find({
                    where: {
                        assign_type: 'house',
                        assign_id: ObjectID(result.id),
                        is_private: false,
                        deleted: false
                    },
                    fields: ['uid'],
                    limit: 10,
                    order: '_id ASC'
                }).then((medias) => {
                    let pics = [];
                    _.each(medias, (media) => {
                        pics.push({
                            uid: media.uid,
                            url: `/medias/get/${media.uid}`
                        })
                    })
                    callback(null, pics);
                })
            }
        ], (err, pics) => {
            result.pictures = pics;
            ctx.result = result;
            next();
        })
    });
    House.afterRemote('GetById', function(ctx, instance, next) {
        let result = ctx.result;
        async.waterfall([
            (callback) => {
                app.models.Account.findOne({
                    where: {
                        personId: result.ownerId
                    }
                }, callback)
            }
        ], (err, owner) => {
            result.owner = {
                uid: owner.id,
                fullName: `${owner.user_profile.firstName} ${owner.user_profile.lastName}`,
                detailUrl: `/accounts/${owner.id}`
            }
            if (owner.user_profile.picture && owner.user_profile.picture.hash) {
                result.owner.picture = {
                    url: `/user-profiles/${owner.id}/picture/${owner.user_profile.picture.hash}`
                }
            } else {
                result.owner.picture = {
                    url: `/medias/avatar/${owner.id}`
                }
            }
            ctx.result = result;
            next();
        })
    });

    House.remoteMethod(
        'GetById', {
            description: 'Get a house by id',
            accepts: [{
                arg: 'id',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                }
            }],
            returns: {
                arg: 'house',
                type: 'object',
                root: true
            },
            http: {
                path: '/:id',
                verb: 'get',
                status: 200
            }
        }
    );

    //===================================================================================================================

    /**
     * Returns all `House` instances based on filter
     * @param {Object} paging {limit, skip}
     * @param {Callback} cb
     * @returns {HouseDTO[]}
     */
    House.GetAll = function(paging, cb) {
        cb = cb || PromiseCallback();
        var filter = paging;
        this.injectLangToFilter(filter);
        filter.where = filter.where || {};
        filter.where.deleted = false;
        House.find(filter).then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    /**
     * Refine pagination arg
     */
    House.beforeRemote('GetAll', Pagination.RemoteHooks.refinePaginationParams);

    House.afterRemote('GetAll', Pagination.RemoteHooks.afterPaginatedService);
    House.afterRemote('GetAll', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod(
        'GetAll', {
            description: 'Returns all `House` instances based on input filtering',
            accepts: [{
                arg: 'paging',
                type: 'object',
                required: true,
                http: Pagination.Common.HttpPagingParam,
                description: ['Calculated parameter.',
                    'In REST call should be like : `/houses?limit=25&skip=150`'
                ]
            }],
            returns: {
                arg: 'houses',
                type: 'array',
                root: true,
                description: 'List of paginated `House` instances'
            },
            http: {
                path: '/',
                verb: 'get',
                status: 200
            }
        }
    );

    //========================================================================================

    /**
     *
     * @param {string | null} term Search term
     * @param {object} paging Like {skip: 0, limit: 10}
     * @param {HttpRequest} req
     * @param {HttpResponse} res
     * @param {Callback} cb
     * @returns {HouseDTO[]}
     */
    House.Search = function(term, paging, req, res, cb) {
        cb = cb || Common.PromiseCallback();
        var filter = paging;

        //type of argument is string so we test it by empty string
        if (term !== '') {
            // filter.where = { name: { like: term, options: 'i' } }; // i denotes insensitivity
            filter.where = {
                or: [{
                    name: { like: term, options: 'i' }
                }, {
                    'location.city': { like: term, options: 'i' }
                }, {
                    'location.province': { like: term, options: 'i' }
                }, {
                    'location.address': { like: term, options: 'i' }
                }]
            }; // i denotes insensitivity
        }
        filter.where = filter.where || {};
        filter.where.deleted = false;
        // filter.where.status = 'listed';
        filter.order = '_id DESC';
        // debug('filter', filter)
        House
            .find(filter)
            .then(Persistency.CrudHandlers.successHandler(cb))
            .catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.beforeRemote('Search', Pagination.RemoteHooks.argumentWrapper(['term']));

    /**
     * Refine pagination arg
     */
    House.beforeRemote('Search', Pagination.RemoteHooks.refinePaginationParams);

    House.afterRemote('Search', Pagination.RemoteHooks.afterPaginatedService);
    House.afterRemote('Search', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod(
        'Search', {
            description: 'Search in houses',
            accepts: [{
                arg: 'term',
                type: 'string',
                required: true,
                http: function(ctx) {
                    var req = ctx.req;
                    return (req.query && req.query.term) ? req.query.term : '';
                }
            }, {
                arg: 'paging',
                type: 'object',
                required: true,
                http: Pagination.Common.HttpPagingParam
            }, {
                arg: 'req',
                type: 'object',
                required: true,
                http: {
                    source: 'req'
                }
            }, {
                arg: 'res',
                type: 'object',
                required: true,
                http: {
                    source: 'res'
                }
            }],
            returns: {
                arg: 'houses',
                type: '[object]',
                root: true,
            },
            http: {
                path: '/search',
                verb: 'get',
                status: 200
            }
        }
    );

    //===================================================================================================================

    /**
     * Returns all `House` instances based on filter belongs to current user
     * @param {Object} paging {limit, skip}
     * @param {HttpRequest} req
     * @param {Callback} cb
     * @returns {HouseDTO[]}
     */
    House.GetMyHouses = function(paging, paging2, req, cb) {
        cb = cb || PromiseCallback();

        paging = _.merge(paging, paging2);
        let specHouse = req.query.house || null;

        let ctx = LoopBackContext.getCurrentContext();
        let currentUser = ctx && ctx.get('currentUser');
        if (!currentUser) cb({ status: 401, message: 'unauthorized' });

        var self = this;

        async.waterfall([
            function(callback) {
                var filter = paging;
                self.injectLangToFilter(filter);
                filter.where = filter.where || {};
                filter.where.deleted = false;
                filter.where.ownerId = currentUser.personId;
                if (req.params.filter && ['listed', 'unlisted', 'incomplete'].indexOf(req.params.filter) > -1) {
                    filter.where.status = req.params.filter;
                }
                if (specHouse) {
                    filter.where.id = specHouse;
                }
                House.find(filter, callback);
            }
        ], cb);

        return cb.promise;
    };

    /**
     * Refine pagination arg
     */
    House.beforeRemote('GetMyHouses', Pagination.RemoteHooks.refinePaginationParams);

    House.afterRemote('GetMyHouses', Pagination.RemoteHooks.afterPaginatedService);
    House.afterRemote('GetMyHouses', Common.RemoteHooks.convert2Dto(House));
    House.afterRemote('GetMyHouses', function(ctx, instance, next) {
        var result = ctx.result;
        if (result.length) {
            result = underscore.map(result, function(item) {
                if (item.prices) {
                    item.price = Number(item.prices.price) > 0 ? `${item.prices.price} هزار تومان` : 'رایگان';
                }
                return item;
            });
            // add icon to features
            if (result.features && result.features.length) {
                _.map(result.features, (feature) => {
                    feature.icon = `/medias/feature/${feature.key}`;
                })
            }
            ctx.result = result;
        }
        next();
    });
    House.afterRemote('GetMyHouses', function(ctx, instance, next) {
        let result = ctx.result;
        async.waterfall([
            (callback) => {
                if (result.length) {
                    let query = {
                        where: {
                            assign_type: 'house',
                            or: [],
                            is_private: false,
                            deleted: false
                        },
                        fields: ['uid', 'assign_id'],
                        order: '_id ASC'
                    }
                    _.each(result, (house) => {
                        query.where.or.push({ assign_id: ObjectID(house.id) })
                    })
                    if (!query.where.or.length) delete query.where.or;
                    app.models.Media.find(query)
                        .then((medias) => {
                            callback(null, medias);
                        })
                } else {
                    callback(null, []);
                }
            }
        ], (err, pics) => {
            if (pics.length) {
                _.each(pics, (pic) => {
                    let resultIndex = _.findIndex(result, { id: pic.assign_id })
                    if (result[resultIndex]) {
                        _.each(result[resultIndex].pictures, function(oldPic, idx) {
                            if (_.has(oldPic, 'styles')) result[resultIndex].pictures.splice(idx, 1);
                        });
                        if (result[resultIndex].pictures.length < 10) {
                            result[resultIndex].pictures.push({
                                uid: pic.uid,
                                url: `/medias/get/${pic.uid}`
                            });
                        }
                    }
                });
                ctx.result = result;
            }
            next();
        })
    });

    House.remoteMethod(
        'GetMyHouses', {
            description: 'Returns all `House` instances based on input filtering and belongs to current user',
            accepts: [{
                arg: 'paging',
                type: 'object',
                required: true,
                http: Pagination.Common.HttpPagingParam,
                description: ['Calculated parameter.',
                    'In REST call should be like : `/houses?limit=25&skip=150`'
                ]
            }, {
                arg: 'paging2',
                type: 'object',
                http: Pagination.RemoteAccepts.analyzeRequest
            }, {
                arg: 'req',
                type: 'object',
                required: true,
                http: { source: 'req' }
            }],
            returns: {
                arg: 'houses',
                type: 'array',
                root: true,
                description: 'List of paginated `House` instances'
            },
            http: {
                path: '/my-houses/:filter?',
                verb: 'get',
                status: 200
            }
        }
    );
}

/**
 * @param House
 * @ignore
 */
function definePictureStuff(House) {

    /**
     * Module method for uploading one picture
     * @param id
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Object}
     * @memberOf Models.House
     */
    House.UploadPicture = function(id, ctx, cb) {
        cb = cb || Common.PromiseCallback();

        House.findById(id).then(houseFoundHandler).catch(houseNotFoundHandler);

        return cb.promise;

        function houseFoundHandler(house) {
            var options = {};
            app.models.HouseImageContainer.UploadPicture(house, ctx, options).then(uploadCompletedHandler).catch(uploadFailedHandler);

            function uploadCompletedHandler(result) {
                var pictures = result.db; //synced
                house.updateAttributes({ pictures: pictures }).then(function(updatedhouse) {
                    var api = {};
                    api.url = `/houses/${updatedhouse.id}/pictures/${result.api[0].hash}`;
                    api.styles = underscore.reduce(result.api[0].styles, function(memo, stylePack) {
                        return underscore.extend(memo, stylePack.style);
                    }, {});
                    cb(null, api);
                }).catch(uploadFailedHandler);
            }

            function uploadFailedHandler(err) {
                cb(err);
            }
        }

        function houseNotFoundHandler(err) {
            cb(Persistency.Errors.NotFound());
        }
    };

    /**
     * added by aref
     */
    House.UploadPicture2 = function(id, data, cb) {
        cb = cb || promiseCallback();

        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx && ctx.get('currentUser');

        House.findById(id)
            .then(houseFoundHandler)
            .catch(houseNotFoundHandler);

        function houseFoundHandler(house) {
            var totalPictures = house.pictures && house.pictures.length ? house.pictures.length : 0;
            if (totalPictures === 10) {
                var err = new Error();
                err.status = 400;
                err.message = 'you can not upoload more than 10 pictures for a house';
                cb(err);
            } else {
                // console.log('uploading picture for house#' + house.id);
                app.models.HouseImageContainer
                    .UploadPicture(house, data)
                    .then(uploadCompletedHandler)
                    .catch(uploadFailedHandler);
            }

            function uploadCompletedHandler(result) {
                var pictures = result.db; //synced
                house.updateAttributes({ pictures: pictures })
                    .then(function(updatedhouse) {
                        var api = {};
                        api.url = `/houses/${updatedhouse.id}/pictures/${result.api[0].hash}`;
                        api.styles = underscore.reduce(result.api[0].styles, function(memo, stylePack) {
                            return underscore.extend(memo, stylePack.style);
                        }, {});
                        cb(null, api);
                    })
                    .catch(uploadFailedHandler);
            }

            function uploadFailedHandler(err) {
                cb(err);
            }
        }

        function houseNotFoundHandler(err) {
            // console.log('houseNotFoundHandler', err);
            cb(Persistency.Errors.NotFound());
        }

        return cb.promise;
    };

    /**
     * Defines uploading picture service method as a REST API
     * @ignore
     */
    House.remoteMethod('UploadPicture2', {
        // accepts: [
        //     { arg: 'id', type: 'string', required: true, http: { source: 'path' } },
        //     { arg: 'ctx', type: 'object', http: { source: 'context' } }
        // ],
        accepts: [{
            arg: 'id',
            type: 'string',
            required: true,
            http: {
                source: 'path'
            }
        }, {
            arg: 'data',
            type: 'object',
            http: {
                source: 'context'
            }
        }],
        returns: {
            arg: 'fileObject',
            type: 'object',
            root: true
        },
        http: {
            verb: 'post',
            status: 201,
            path: '/:id/picture'
        }
    });

    /**
     * Module method for uploading multiple pictures
     * @param {string} houseId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Array}
     * @memberOf Models.House
     */
    House.UploadPictureAll = function(houseId, ctx, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(houseId).then(houseFoundHandler).catch(houseNotFoundHandler);

        return cb.promise;

        function houseFoundHandler(house) {

            var options = {};
            app.models.HouseImageContainer.UploadPictureAll(house, ctx, options).then(uploadCompletedHandler).catch(uploadFailedHandler);

            function uploadCompletedHandler(result) {
                var pictures = result.db; //synced 
                house.updateAttributes({ pictures: pictures }).then(function(updatedHouse) {
                    var apiArr = [];
                    underscore.each(result.api, function(filePack) {
                        var api = {};
                        api.url = `/houses/${updatedHouse.id}/pictures/${filePack.hash}`;
                        api.styles = underscore.reduce(filePack.styles, function(memo, stylePack) {
                            return underscore.extend(memo, stylePack.style);
                        }, {});
                        apiArr.push(api);
                    });

                    cb(null, apiArr);
                }).catch(uploadFailedHandler);
            }

            function uploadFailedHandler(err) {
                cb(err);
            }
        }

        function houseNotFoundHandler(err) {
            // console.log(err);
            cb(Persistency.Errors.NotFound());
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     * @ignore
     */
    House.remoteMethod('UploadPictureAll', {
        accepts: [
            { arg: 'id', type: 'string', required: true, http: { source: 'path' } },
            { arg: 'ctx', type: 'object', http: { source: 'context' } }
        ],
        returns: {
            arg: 'fileObject',
            type: 'array',
            root: true
        },
        http: { verb: 'post', status: 201, path: '/:id/pictures' }
    });

    /**
     * Module method for downloading house picture by its name
     * @param {string} id
     * @param {string} hash Picture hash
     * @param {String} style
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Stream}
     * @memberOf Models.House
     */
    House.DownloadPicture = function(id, hash, style, ctx, cb) {
        cb = cb || Common.PromiseCallback();

        House.findById(id).then(houseFoundHandler).catch(houseNotFoundHandler);

        return cb.promise;

        function houseFoundHandler(house) {

            try {
                app.models.HouseImageContainer.DownloadPicture(house, hash, style, ctx);
            } catch (ex) {
                cb(ex);
            }
        }

        function houseNotFoundHandler(err) {
            cb(err);
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     * @ignore
     */
    House.remoteMethod('DownloadPicture', {
        accepts: [
            { arg: 'id', type: 'string', required: true, http: { source: 'path' } },
            { arg: 'hash', type: 'string', required: true, http: { source: 'path' } }, {
                arg: 'style',
                type: 'string',
                http: function(ctx) {
                    var req = ctx.req;
                    var query = req.query || {};
                    var style = query['style'] ? query['style'] : null;
                    return style ? style.trim() : '';
                }
            },
            { arg: 'ctx', type: 'object', http: { source: 'context' } }
        ],
        returns: {
            arg: 'fileObject',
            type: 'object',
            root: true
        },
        http: { verb: 'get', path: '/:id/pictures/:hash' }
    });

    /**
     * Returns list of picture files
     * @param {string} houseId
     * @param {HttpContext} ctx
     * @param {Callback} cb
     * @returns {Array}
     */
    House.GetPictureList = function(houseId, ctx, cb) {
        cb = cb || Common.PromiseCallback();

        House.findById(houseId).then(houseFoundHandler).catch(houseNotFoundHandler);

        return cb.promise;

        function houseFoundHandler(house) {
            if (!house) {
                return cb(Persistency.Errors.NotFound());
            }

            try {
                var pictures = app.models.HouseDTO.GetPictures(house);
                cb(null, pictures);
            } catch (ex) {
                cb(ex);
            }
        }

        function houseNotFoundHandler(err) {
            cb(err);
        }
    };

    /**
     * Defines uploading picture service method as a REST API
     */
    House.remoteMethod('GetPictureList', {
        accepts: [
            { arg: 'houseId', type: 'string', http: { source: 'path' } },
            { arg: 'ctx', type: 'object', http: { source: 'context' } }
        ],
        returns: {
            arg: 'fileObject',
            type: 'array',
            root: true
        },
        http: { verb: 'get', path: '/:houseId/pictures' }
    });
}

function defineFeatureStuff(House) {

    function houseFoundForFeatureErrorHandler(cb) {
        return function(err) {
            cb(err);
        };
    }

    function houseFoundForAddFeatureHandler(ids, cb) {
        return function(house) {
            if (!house) {
                return cb(Persistency.Errors.NotFound());
            }
            app.models.HouseFeature.find({ where: { id: { inq: lodash.compact(ids) } } }).then((features) => {
                //we should add those which are not persisted before
                var existedFeatures = house.houseFeatures.value();
                var refinedFeatures = lodash.reject(features, function(item) {
                    var found = lodash.find(existedFeatures, function(inner) {
                        return item.id === inner.id || (item.key === inner.key && item.lang === inner.lang);
                    });
                    return !lodash.isNil(found);
                });
                async.each(refinedFeatures, house.houseFeatures.create, function(err) {
                    house.reload(cb);
                });
            }).catch(() => {
                cb(null, house);
            });
        };
    }

    function houseFoundForDeleteFeatureHandler(key, cb) {
        return function(house) {
            if (!house) {
                return cb(Persistency.Errors.NotFound());
            }

            house.houseFeatures.destroyAll({ or: [{ id: key }, { key: key }] }, function(err) {
                if (err) return cb(err);
                house.reload(cb);
            });
        };
    }

    /**
     * Add feature to house.
     * Note that we persist plain feature object i.e json format of feature without id
     * @param {string} id House id
     * @param {Array} ids HouseFeature id array
     * @param {Callback} cb
     */
    House.AddFeature = function(id, ids, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(id).then(houseFoundForAddFeatureHandler(ids, cb)).catch(houseFoundForFeatureErrorHandler(cb));
        return cb.promise;
    };

    House.afterRemote('AddFeature', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod('AddFeature', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'ids', type: 'array', http: { source: 'path' } }
        ],
        returns: {
            arg: 'house',
            type: 'HouseDTO',
            root: true
        },
        http: { verb: 'post', status: 201, path: '/:id/features/:ids' }
    });

    /**
     * Removes a feature from a house
     * @param {string} id House id
     * @param {string} key HouseFeature key
     * @param {Callback} cb
     */
    House.DeleteFeature = function(id, key, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(id).then(houseFoundForDeleteFeatureHandler(key, cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.afterRemote('DeleteFeature', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod('DeleteFeature', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'key', type: 'string', http: { source: 'path' } }
        ],
        returns: {
            arg: 'house',
            type: 'HouseDTO',
            root: true
        },
        http: { verb: 'delete', status: 201, path: '/:id/features/:key' }
    });
}

function defineExtraServicesStuff(House) {

    House.beforeRemote('CreateExtraService', function(ctx, instance, next) {
        var args = ctx.args;
        if (args) {
            if (args.data) {
                args.data.id = randomString.generate({
                    charset: 'hex'
                });
                if (args.data.price && !args.data.price.currency) {
                    args.data.price.currency = app.settings.currency.default;
                }
            }
        }
        next();
    });

    function houseFoundForCreatingExtraService(data, cb) {
        return function(house) {
            if (!house) {
                return cb(Persistency.Errors.NotFound());
            }
            house.extraServices.create(data).then((service) => {
                cb(null, service);
            }).catch((e) => {
                cb(e);
            });
        }
    }

    /**
     * Creates an `HouseExtraService` as an extra service for house
     * @param {string} id House id
     * @param {object} data
     * @param {Callback} cb
     */
    House.CreateExtraService = function(id, data, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(id).then(houseFoundForCreatingExtraService(data, cb)).catch((e) => {
            cb(e);
        });
        return cb.promise;
    };

    House.remoteMethod('CreateExtraService', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'data', type: 'object', http: { source: 'body' } }
        ],
        http: { verb: 'post', status: 204, path: '/:id/extra-services' }
    });

    /**
     * Delete an extra service by id
     * @param {string} id House id
     * @param {string} extraServiceId extra service id
     * @param {Callback} cb
     */
    House.DeleteExtraService = function(id, extraServiceId, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            house.extraServices.unset(extraServiceId, cb);
        }).catch((e) => {
            cb(e);
        });
        return cb.promise;
    };

    House.remoteMethod('DeleteExtraService', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'extraServiceId', type: 'string', http: { source: 'path' } }
        ],
        http: { verb: 'delete', status: 204, path: '/:id/extra-services/:extraServiceId' }
    });

    /**
     * Get all extra services of the house
     * @param {string} id house id
     * @param {Callback} cb
     */
    House.GetAllExtraServices = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            cb(null, house.extraServices.value());

        }).catch((e) => {
            cb(e);
        });
        return cb.promise;
    };

    House.remoteMethod('GetAllExtraServices', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } }
        ],
        returns: [{
            arg: 'service',
            type: 'array',
            root: true
        }],
        http: { verb: 'get', status: 200, path: '/:id/extra-services' }
    });

    /**
     * Get an extra service by its id
     * @param {string} id house id
     * @param {service} extraServiceId extra service id
     * @param {Callback} cb
     */
    House.GetExtraServiceById = function(id, extraServiceId, cb) {
        cb = cb || Common.PromiseCallback();
        House.findById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            house.__findById__extraServices(extraServiceId, function(e, service) {
                if (e) return cb(e);

                if (!service) return cb(Persistency.Errors.NotFound());

                cb(null, service);
            });
        }).catch((e) => {
            cb(e);
        });
        return cb.promise;
    };

    House.remoteMethod('GetExtraServiceById', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'extraServiceId', type: 'string', http: { source: 'path' } }
        ],
        returns: [{
            arg: 'service',
            type: 'object',
            root: true
        }],
        http: { verb: 'get', status: 200, path: '/:id/extra-services/:extraServiceId' }
    });
}

function defineHouseTypeServiceStuff(House) {

    /**
     * Set type of house
     * @param {string} id house id
     * @param {string} typeId house type id
     * @param {Callback} cb
     */
    House.SetType = function(id, typeId, cb) {
        cb = cb || Common.PromiseCallback();

        async.parallel([
            function(callback) {
                app.models.HouseType.GetById(typeId, callback);
            },
            function(callback) {
                House.GetById(id, callback);
            }
        ], function(err, result) {
            if (err) return cb(err);
            var houseType = result[0];
            var house = result[1];

            house.houseType(houseType);
            house.save().then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        });

        return cb.promise;
    };

    House.afterRemote('SetType', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod('SetType', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'typeId', type: 'string', http: { source: 'path' } }
        ],
        returns: [{
            arg: 'house',
            type: 'HouseDTO',
            root: true
        }],
        http: { verb: 'put', status: 201, path: '/:id/type/:typeId' }
    });

    /**
     * Unset type of house
     * @param {string} id house id
     * @param {Callback} cb
     */
    House.UnsetType = function(id, cb) {
        cb = cb || Common.PromiseCallback();

        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            house.houseType.destroy(cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));

        return cb.promise;
    };

    House.afterRemote('UnsetType', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod('UnsetType', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } }
        ],
        returns: [{
            arg: 'house',
            type: 'HouseDTO',
            root: true
        }],
        http: { verb: 'delete', status: 201, path: '/:id/type' }
    });
}

function defineHouseStatusServiceStuff(House) {

    /**
     * Toggle Status of house
     * @param {string} id house id
     * @param {Callback} cb
     */
    House.toggleStatus = function(id, req, cb) {
        cb = cb || Common.PromiseCallback();

        async.waterfall([
            function(callback) {
                House.findById(id, callback);
            },
            function(house, callback) {
                if (req.params.status && ['listed', 'unlisted', 'incomplete'].indexOf(req.params.status) > -1) {
                    house.status = req.params.status;
                } else {
                    house.status = house.status === 'listed' ? 'unlisted' : 'listed';
                }
                callback(null, house);
            }
        ], function(err, house) {
            if (err) return cb(err);
            house.save()
                .then(Persistency.CrudHandlers.successHandler(cb))
                .catch(Persistency.CrudHandlers.failureHandler(cb));
        });

        return cb.promise;
    };

    // House.afterRemote('toggleStatus', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod('toggleStatus', {
        accepts: [{
            arg: 'id',
            type: 'string',
            http: {
                source: 'path'
            }
        }, {
            arg: 'req',
            type: 'object',
            required: true,
            http: { source: 'req' }
        }],
        returns: [{
            arg: 'house',
            type: 'HouseDTO',
            root: true
        }],
        http: {
            verb: 'put',
            status: 201,
            path: '/:id/status/:status?'
        }
    });
}

function defineHouseSpecServiceStuff(House) {

    /**
     * @param {String} id House id
     * @param {Object} spec
     * @param {Number} spec.accommodate
     * @param {Number} spec.bedroom
     * @param {Number} spec.bed
     * @param {Number} spec.bathroom
     * @param {Callback} cb
     * @return {*}
     * @memberOf Models.House
     */
    House.UpdateSpec = function(id, spec, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            if (spec) {
                spec = app.models.HouseSpec.RefineInput(spec);
                house.spec = house.spec || {};
                spec = lodash.defaults(spec, house.spec.toJSON());
                house.spec = spec;
                house.save().then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
            }
            cb(null, house);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));

        return cb.promise;
    };

    House.beforeRemote('UpdateSpec', Common.RemoteHooks.argShouldNotEmpty('spec'));
    House.beforeRemote('UpdateSpec', Common.RemoteHooks.correctCaseOfKeysInArg('spec', 'HouseSpec'));
    House.beforeRemote('UpdateSpec', Common.RemoteHooks.dataOwnerCorrectorInArg('spec', 'HouseSpec'));
    House.afterRemote('UpdateSpec', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod('UpdateSpec', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'spec', type: 'object', http: { source: 'body' } }
        ],
        returns: [{
            arg: 'house',
            type: 'HouseDTO',
            root: true
        }],
        http: { verb: 'post', status: 201, path: '/:id/spec' }
    });

    //========================================================================================

    House.ResetSpec = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            house.updateAttribute('spec', app.models.HouseSpec.Create(), cb);

        }).catch(Persistency.CrudHandlers.failureHandler(cb));

        return cb.promise;
    };

    House.afterRemote('ResetSpec', Common.RemoteHooks.convert2Dto(House));

    House.remoteMethod('ResetSpec', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } }
        ],
        returns: [{
            arg: 'house',
            type: 'HouseDTO',
            root: true
        }],
        http: { verb: 'delete', status: 204, path: '/:id/spec' }
    });

    //========================================================================================

    House.GetSpec = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            cb(null, house.spec);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));

        return cb.promise;
    };

    House.remoteMethod('GetSpec', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } }
        ],
        returns: [
            { arg: 'spec', type: 'HouseSpec', root: true }
        ],
        http: { verb: 'get', status: 200, path: '/:id/spec' }
    });
}

function defineAvailableDateServiceStuff(House) {

    /**
     * Add specified dates to house as available.
     * @param {string} id House ID
     * @param {object} data Includes date array as GMT
     * @param {Callback} cb
     */
    House.AddAvailableDates = function(id, data, cb) {
        cb = cb || Common.PromiseCallback();

        var ctx = LoopBackContext.getCurrentContext();
        var currentUser = ctx && ctx.get('currentUser');

        var accessCtx = {
            model: House,
            modelId: id,
            principalType: 'Account',
            principalId: currentUser.id,
            accessToken: LoopBackContext.getCurrentContext().active.http.req.accessToken
        };

        async.waterfall([
            function(callback) {
                app.models.Role.isInRole('houseOwner', accessCtx, function(err, isInRole) {
                    if (err) return callback(err);
                    callback(null, isInRole);
                });
            },
            function(isHouseOwner, callback) {
                app.models.Role.isInRole(app.models.Role.ADMIN, accessCtx, function(err, isInRole) {
                    if (err) return callback(err);
                    callback(null, [isHouseOwner, isInRole]);
                });
            }
        ], function(err, result) {
            if (err) return cb(err);
            var isHouseOwner = result[0];
            var isAdmin = result[1];

            debug('AddAvailableDates() => [isOwner, isAdmin] = [%s, %s]', isHouseOwner, isAdmin);

            House.GetById(id).then((house) => {
                if (!house) return cb(Persistency.Errors.NotFound());

                app.models.HouseAvailableDate.AddDates(house, data.dates, isAdmin, isHouseOwner, cb);
            }).catch(Persistency.CrudHandlers.failureHandler(cb));
        });

        return cb.promise;
    };

    House.remoteMethod('AddAvailableDates', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'data', type: 'object', http: { source: 'body' } }
        ],
        http: { verb: 'put', status: 204, path: '/:id/available-dates' }
    });

    House.beforeRemote('AddAvailableDates', Common.RemoteHooks.argShouldNotEmpty('data'));
    House.beforeRemote('AddAvailableDates', function(ctx, instance, next) {
        var dates = ctx.args['data'].dates || [];
        dates = underscore.map(dates, function(strDate) {
            try {
                return moment(strDate).format('YYYY-MM-DD');
            } catch (ex) {
                return null;
            }
        });
        dates = underscore.filter(dates, function(date) {
            return date != null;
        });
        ctx.args['data'].dates = dates;
        next();
    });

    //========================================================================================

    /**
     * Removes specified dates to house as available.
     * Or make unavailable some dates.
     * @param {string} id House ID
     * @param {object} data Includes date array as GMT
     * @param {Callback} cb
     */
    House.RemoveAvailableDates = function(id, data, cb) {
        cb = cb || Common.PromiseCallback();

        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            app.models.HouseAvailableDate.DeleteDates(house, data.dates, cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));

        return cb.promise;
    };

    House.remoteMethod('RemoveAvailableDates', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' } },
            { arg: 'data', type: 'object', http: { source: 'body' } }
        ],
        http: { verb: 'put', status: 204, path: '/:id/available-dates/remove' }
    });

    House.beforeRemote('RemoveAvailableDates', Common.RemoteHooks.argShouldNotEmpty('data'));
    House.beforeRemote('RemoveAvailableDates', function(ctx, instance, next) {
        var dates = ctx.args['data'].dates || [];
        dates = underscore.map(dates, function(strDate) {
            try {
                return moment(strDate).format('YYYY-MM-DD');
            } catch (ex) {
                return null;
            }
        });
        dates = underscore.filter(dates, function(date) {
            return date != null;
        });
        ctx.args['data'].dates = dates;
        next();
    });

    //========================================================================================

    /**
     * Returns dates which are available in date range starting from `startDate` and `endDate` input parameters.
     * @param {string} id House ID
     * @param {string} startDate Start date in ISO format
     * @param {string} endDate End date in ISO format
     * @param {Callback} cb
     */
    House.GetAvailableDates = function(id, startDate, endDate, cb) {
        cb = cb || Common.PromiseCallback();

        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());

            var start = moment(startDate);
            start = start.isValid() ? start.toDate() : new Date();

            var end = moment(endDate);
            end = end.isValid() ? end.toDate() : new Date();

            app.models.HouseAvailableDate.GetDatesInRange(house, start, end, cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));

        return cb.promise;
    };

    House.remoteMethod('GetAvailableDates', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' },
            { arg: 'startDate', type: 'string', http: { source: 'path' }, description: 'Start date in ISO format' },
            { arg: 'endDate', type: 'string', http: { source: 'path' }, description: 'End date in ISO format' }
        ],
        returns: [{
            arg: 'availableDates',
            type: 'array',
            root: true,
            description: ['Dates which are available in date range between `startDate` and `endDate` inputs.']
        }],
        http: { verb: 'get', status: 200, path: '/:id/available-dates/start-:startDate/end-:endDate' },
        description: ['Returns dates which are available in date range starting ',
            'from `startDate` and `endDate` input parameters.'
        ]
    });

    House.afterRemote('GetAvailableDates', Common.RemoteHooks.convert2Dto('HouseAvailableDate'));
}

function definePriceDateServiceStuff(House) {

    /**
     * Add or update prices of house which is attached to a specific date.
     * @param {string} id House Id
     * @param {array} data
     * @param {Callback} cb
     * @returns {promise}
     */
    House.AddOrUpdateDatePrices = function(id, data, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            app.models.HouseDatePrice.AddOrUpdate(house, data, cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('AddOrUpdateDatePrices', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' }, {
                arg: 'data',
                type: 'array',
                http: { source: 'body' },
                description: [
                    '`data` should be an array containing objects like :',
                    '```',
                    '{',
                    'date: JSDate,',
                    'price: {',
                    'amount: Number,',
                    'currency:: String',
                    '}',
                    '}',
                    '```'
                ]
            }
        ],
        http: { verb: 'put', status: 201, path: '/:id/date-prices' },
        description: ['Adds new instances or updates existing entities based on input `data`.']
    });

    //========================================================================================

    /**
     * Get prices of house which is attached to a specific date.
     * @param {string} id House Id
     * @param {string} startDate Start date string in ISO format
     * @param {string} endDate End date string in ISO format
     * @param {Callback} cb
     * @returns {promise}
     */
    House.GetDatePricesInRange = function(id, startDate, endDate, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            app.models.HouseDatePrice.GetInRange(house, startDate, endDate, cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('GetDatePricesInRange', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' },
            { arg: 'startDate', type: 'string', http: { source: 'path' }, description: 'Start date string in ISO format' },
            { arg: 'endDate', type: 'string', http: { source: 'path' }, description: 'End date string in ISO format' }
        ],
        returns: [{
            arg: 'datePrices',
            type: '[HouseDatePrice]',
            root: true,
            description: ['Date prices objects which are available in date range between `startDate` and `endDate` inputs.']
        }],
        http: { verb: 'get', status: 200, path: '/:id/date-prices/start-:startDate/end-:endDate' },
        description: ['Returns date prices which are available between `startDate` and `endDate`.']
    });

    //========================================================================================

    /**
     * Set prices of dates which are in date array to default.
     * @param {string} id House Id
     * @param {array} dates Array of dates in ISO format
     * @param {Callback} cb
     * @returns {Promise}
     */
    House.UnsetDatePricesInRange = function(id, dates, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            app.models.HouseDatePrice.UnSetInRange(house, dates, cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('UnsetDatePricesInRange', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' },
            { arg: 'dates', type: 'array', http: { source: 'body' }, description: 'Array of dates in ISO format' }
        ],
        http: { verb: 'put', status: 201, path: '/:id/date-prices/unset' },
        description: ['Set prices of dates which are in `dates` array to default ']
    });

}

function definePriceProfileServiceStuff(House) {

    /**
     * Set/Update `HousePriceProfile` as price profile (`priceProfile`) for the house recognized by `id`
     * @param {string} id House Id
     * @param {object} data Input data. `HousePriceProfile`
     * @param {Callback} cb
     * @returns {Promise}
     */
    House.SetPriceProfile = function(id, data, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            app.models.HousePriceProfile.SetForHouse(house, data, cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('SetPriceProfile', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' }, {
                arg: 'data',
                type: 'object',
                http: { source: 'body' },
                description: 'Input profile data as `HousePriceProfile`'
            }
        ],
        http: { verb: 'put', status: 201, path: '/:id/price-profile' },
        description: ['Set price profile for the house.']
    });

    House.beforeRemote('SetPriceProfile', Common.RemoteHooks.argShouldNotEmpty('data'));
    House.beforeRemote('SetPriceProfile', Common.RemoteHooks.correctCaseOfKeysInArg('data', 'HousePriceProfile'));
    House.beforeRemote('SetPriceProfile', Common.RemoteHooks.dataOwnerCorrectorInArg('data', 'HousePriceProfile'));

    //========================================================================================

    /**
     * Unset/Delete price profile of the house recognized by `id` as `priceProfile` field.
     * @param {string} id House Id
     * @param {Callback} cb
     * @returns {Promise}
     */
    House.UnsetPriceProfile = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            house.priceProfile.destroy().then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('UnsetPriceProfile', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' }
        ],
        http: { verb: 'delete', status: 201, path: '/:id/price-profile' },
        description: ['Unset price profile for the house.']
    });

    //========================================================================================

    /**
     * Returns `priceProfile` of the house recognized by `id`.
     * @param {string} id House Id
     * @param {Callback} cb
     * @returns {Promise}
     */
    House.GetPriceProfile = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            var priceProfile = house.priceProfile.value();
            if (!priceProfile) return cb(null);
            cb(null, priceProfile);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('GetPriceProfile', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' }
        ],
        returns: [{
            arg: 'priceProfile',
            type: 'HousePriceProfile',
            root: true,
            description: ['Price profile of the house.',
                'It is configuration of price of the house.'
            ]
        }],
        http: { verb: 'get', status: 200, path: '/:id/price-profile' },
        description: ['Get price profile for the house.']
    });
}

function defineCancellationPolicyServiceStuff(House) {

    /**
     * Set cancellation policy for the house. It should be selected from existing `HouseCancellationPolicy` instances.
     * @param {string} id House id
     * @param {string} policyId `HouseCancellationPlicy` id
     * @param {Callback} cb
     * @returns {Promise}
     */
    House.SetCancellationPolicy = function(id, policyId, cb) {
        cb = cb || Common.PromiseCallback();
        async.parallel([
                function(callback) {
                    House.GetById(id, callback);
                },
                function(callback) {
                    app.models.HouseCancellationPolicy.GetById(policyId, callback);
                }
            ],
            function(err, result) {
                if (err) return cb(err);
                var house = result[0];
                var policy = result[1];
                house.cancellationPolicy = policy;
                house.save().then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
            });
        return cb.promise;
    };

    House.remoteMethod('SetCancellationPolicy', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' }, {
                arg: 'policyId',
                type: 'string',
                http: { source: 'path' },
                description: 'Cancellation policy ID. `HouseCancellationPolicy` model'
            }
        ],
        http: { verb: 'put', status: 204, path: '/:id/cancellation-policy/:policyId' },
        description: ['Set cancellation policy for the house.',
            'It should be selected from existing `HouseCancellationPolicy` instances.'
        ]
    });

    //========================================================================================

    /**
     * Unset cancellation policy for the house.
     * @param {string} id House id
     * @param {Callback} cb
     * @returns {Promise}
     */
    House.UnsetCancellationPolicy = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            house.cancellationPolicyRel.destroy().then(Persistency.CrudHandlers.successHandler(cb)).catch(Persistency.CrudHandlers.failureHandler(cb));
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('UnsetCancellationPolicy', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' }
        ],
        http: { verb: 'delete', status: 204, path: '/:id/cancellation-policy' },
        description: ['Unset cancellation policy for the house.']
    });

    //========================================================================================

    /**
     * Returns cancellation policy for the house. If nothing existed returns empty object.
     * @param {string} id House id
     * @param {Callback} cb
     * @returns {Promise}
     */
    House.GetCancellationPolicy = function(id, cb) {
        cb = cb || Common.PromiseCallback();
        House.GetById(id).then((house) => {
            if (!house) return cb(Persistency.Errors.NotFound());
            house.__get__cancellationPolicyRel(cb);
        }).catch(Persistency.CrudHandlers.failureHandler(cb));
        return cb.promise;
    };

    House.remoteMethod('GetCancellationPolicy', {
        accepts: [
            { arg: 'id', type: 'string', http: { source: 'path' }, description: 'House ID' }
        ],
        returns: [{
            arg: 'cancellationPolicy',
            type: 'HouseCancellationPolicyDTO',
            root: true,
            description: ['Cancellation policy of the house.']
        }],
        http: { verb: 'get', status: 200, path: '/:id/cancellation-policy' },
        description: ['Returns cancellation policy for the house. If nothing existed returns empty object.']
    });

    House.afterRemote('GetCancellationPolicy', Common.RemoteHooks.convert2Dto('HouseCancellationPolicy'));
}
