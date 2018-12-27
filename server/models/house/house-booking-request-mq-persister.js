//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var app = serverRequire('server');
var Common = require('narengi-utils').Common;
var Persistency = require('narengi-utils').Persistency;
var moment = require('moment');
var async = require('async');
var MQ = require('bull');

/**
 * This module is responsible for persisting logs of house book request lifecycle
 * @namespace HouseBookingRequestMQPersister
 */
module.exports = function(Model) {
    setupMQ(Model);
    addServices(Model);
};

function setupMQ(Model){
    Model.PersisterQ = MQ('house-book-request:persister', app.settings.notification.redis.port, app.settings.notification.redis.host, app.settings.notification.redis);
    Model.PersisterQ.process(function (job, done) {
        var data = job.data;
        async.waterfall([
            function(callback){
                Model.create({requestId: data.bookRequest.id, event: data.event, from: data.from, to: data.to}, callback);
            },
            function(entity, callback){
                if(!entity) return callback(Persistency.Errors.NotSaved());
                entity.request.create(data.request, callback);
            }
        ], function(err, result){
            if(err) return done(err);
            done(null, job);
        });
    });
    Model.PersisterQ.on('failed', function (error) {
        //TODO log
    });
    Model.PersisterQ.on('error', function (error) {
        //TODO log
    });
}

function addServices(Model){

    /**
     * Quques a job processing changes to states of house book request `HouseBookingRequest`
     * @param {HouseBookingRequest} bookRequest
     * @param {String} event
     * @param {String} from
     * @param {String} to
     * @param {Callback} cb
     * @memberOf HouseBookingRequestMQPersister
     */
    Model.Persist = function(bookRequest, event, from, to, cb){
        cb = cb || Common.PromiseCallback();
        Model.PersisterQ.add({bookRequest: bookRequest, event: event, from: from, to: to, data: moment.utc().toDate()}, {attempts: 10, backoff: {type: 'fixed', delay: 30000}}, cb);
        return cb.promise;
    };
}