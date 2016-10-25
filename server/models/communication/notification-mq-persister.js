'use strict';
//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var app = serverRequire('server');
var Common = require('narengi-utils').Common;
var Persistency = require('narengi-utils').Persistency;
var moment = require('moment');
var async = require('async');
var MQ = require('bull');

var Notification = app.models.Notification;

/**
 * This module is responsible for persisting notification jobs.
 * Actually logs job lifecycle of sending a notification
 * @namespace NotificationMQPersister
 */
module.exports = function (Notificationmqpersister) {
    setupMQ(Notificationmqpersister);
    addServices(Notificationmqpersister);
};

function setupMQ(Model) {
    Model.NewJobQ = MQ('notification:persister:new', app.settings.notification.redis.port, app.settings.notification.redis.host, app.settings.notification.redis);
    Model.NewJobQ.process(function (job, done) {
        var data = job.data;
        Model.create({
            id: data.job.jobId,
            queue: data.queueName,
            jobs: [data.job]
        }, done);
    });
    Model.NewJobQ.on('failed', function (error) {
        //TODO log
    });
    Model.NewJobQ.on('error', function (error) {
        //TODO log
    });

    //=========================================================================

    Model.CompletedJobQ = MQ('notification:persister:completed', app.settings.notification.redis.port, app.settings.notification.redis.host, app.settings.notification.redis);
    Model.CompletedJobQ.process(function (job, done) {
        var data = job.data;
        async.parallel({
            notification: function (callback) {
                Notification.Create({
                    date: moment.utc().toDate(),
                    accountId: data.job.data.accountId,
                    type: data.job.data.notificationType,
                    info: {
                        type: data.job.data.type
                    },
                    payload: data.job.data,
                    result: data.result
                }, callback);
            },
            mq: function (callback) {
                async.waterfall([
                    function (wCallback) {
                        Model.findById(data.job.jobId, wCallback);
                    },
                    function (entity, wCallback) {
                        if (!entity) return wCallback(Persistency.Errors.NotFound({message: 'error.persistency.notification_mq.not_found'}));
                        entity.jobs.push(data.job);
                        entity.save(wCallback);
                    }
                ], callback);
            }
        }, function (error, output) {
            if (error) return done(error);
            done(null, output.mq);
        });
    });
    Model.CompletedJobQ.on('failed', function (error) {
        //TODO log
    });
    Model.CompletedJobQ.on('error', function (error) {
        //TODO log
    });

    //=========================================================================

    Model.FailureJobQ = MQ('notification:persister:failure', app.settings.notification.redis.port, app.settings.notification.redis.host, app.settings.notification.redis);
    Model.FailureJobQ.process(function (job, done) {
        var data = job.data;
        async.waterfall([
            function (callback) {
                Model.findById(data.job.jobId, callback);
            },
            function (entity, callback) {
                if (!entity) return callback(Persistency.Errors.NotFound({message: 'error.persistency.notification_mq.not_found'}));
                entity.jobs.push({job: data.job, error: data.error});
                entity.save(callback);
            }
        ], function (err, result) {
            if (err) return done(err);
            done(null, result);
        });
    });
    Model.FailureJobQ.on('failed', function (error) {
        //TODO log
    });
    Model.FailureJobQ.on('error', function (error) {
        //TODO log
    });

    //=========================================================================

    Model.ErrorJobQ = MQ('notification:persister:error', app.settings.notification.redis.port, app.settings.notification.redis.host, app.settings.notification.redis);
    Model.ErrorJobQ.process(function (job, done) {
        var data = job.data;
        //TODO just log not persisting in db
    });
    Model.ErrorJobQ.on('failed', function (error) {
        //TODO log
    });
    Model.ErrorJobQ.on('error', function (error) {
        //TODO log
    });
}

function addServices(Model) {

    /**
     * Queues a job to persist a new notification job
     * @param {Object} job
     * @param {String} type Type of notification eg EMAIL
     * @param {String} subType Sub type of notification eg Account_Registration
     * @param {String} queueName Queue name
     * @param {Callback} cb
     * @memberOf NotificationMQPersister
     */
    Model.PersistNewJob = function (job, type, subType, queueName, cb) {
        cb = cb || Common.PromiseCallback();
        Model.NewJobQ.add({job: job, type: type, subType: subType, queueName: queueName}, {attempts: 10, backoff: {type: 'fixed', delay: 30000}}).then((/*res*/) => {cb(null, job);}).catch((e) => {cb(e);});
        return cb.promise;
    };

    /**
     * Queues a job to persist a completed notification job
     * @param {Object} job
     * @param {Object} result Result of sending notification from underlying service. For example email service sends an email and send back the result
     * @param {String} queueName
     * @param {Callback} cb
     * @memberOf NotificationMQPersister
     */
    Model.PersistJobCompleted = function (job, result, queueName, cb) {
        cb = cb || Common.PromiseCallback();
        Model.CompletedJobQ.add({job: job, result: result, queueName: queueName}, {attempts: 10, backoff: {type: 'fixed', delay: 30000}}).then((/*res*/) => {cb(null, job);}).catch((e) => {cb(e);});
        return cb.promise;
    };

    /**
     * Queues a job to persist a failure encountering processing a notification job. Note that this is after multiple attempting notification job
     * @param {Object} job
     * @param {Object} error
     * @param {String} queueName
     * @param {Callback} cb
     * @memberOf NotificationMQPersister
     */
    Model.PersistJobFailure = function (job, error, queueName, cb) {
        cb = cb || Common.PromiseCallback();
        Model.FailureJobQ.add({job: job, error: error, queueName: queueName}, {attempts: 10, backoff: {type: 'fixed', delay: 30000}}).then((/*res*/) => {cb(null, job);}).catch((e) => {cb(e);});
        return cb.promise;
    };

    /**
     * Queues a job to persist an error while processing notification processing. This is different to failure
     * @param {Object} error
     * @param {String} queueName
     * @param {Callback} cb
     * @memberOf NotificationMQPersister
     */
    Model.PersistJobError = function (error, queueName, cb) {
        cb = cb || Common.PromiseCallback();
        Model.ErrorJobQ.add({error: error, queueName: queueName}, {attempts: 10, backoff: {type: 'fixed', delay: 30000}}).then((/*res*/) => {cb(null, job);}).catch((e) => {cb(e);});
        return cb.promise;
    };
}
