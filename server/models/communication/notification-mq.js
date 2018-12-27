//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var app = serverRequire('server');
var Common = require('narengi-utils').Common;
var EmailModule = require('narengi-messaging').Email;
var SmsModule = require('narengi-messaging').SMS;
var NotificationConstants = require('../../../common/constants/notification-constants');
var debugEmail = require('debug')('narengi:service:notification-mq:email');
var debugSms = require('debug')('narengi:service:notification-mq:sms');
var MQ = require('bull');
var path = require('path');
var fs = require('fs');
var smsCompiler = require('string-template/compile');

var emailServices = {};
var emailOptions = {};
var smsServices = {};

/**
 * This is responsible for job queueing and processing them
 * @namespace NotificationMQ
 */
module.exports = function (Notificationmq) {
    setupServices(Notificationmq);
    setupMQ(Notificationmq);
    addServices(Notificationmq);
};

function getEmailService(lang){
    if(!emailServices[lang]){
        try {
            emailServices[lang] = EmailModule.GetService(emailOptions[lang]);
        }
        catch (e) {
            debugEmail("Creating mail service failed");
        }
    }
    return emailServices[lang];
}

function getSMSService(lang){
    if(!smsServices[lang]){
        options = app.settings.notification.sms[app.settings.notification.sms.current];
        try {
            smsService = SmsModule.CreateService(options);
        }
        catch (e) {
            debugSms("service does not created");
            return cb(e);
        }
    }
    return smsServices[lang];
}

function setupServices(Model) {
    for (var lang in app.settings.locale.allowed) {
        var templatePath = path.join(__dirname, '..', '..', '..', 'common', 'templates', lang, 'email');
        var options = {};
        options.smtp = app.settings.notification.email.default.smtp;
        options.engine = {
            viewEngine: {
                extname: '.hbs',
                layoutsDir: templatePath,
                defaultLayout: 'base',
                partialsDir: path.join(templatePath, 'partials')
            },
            viewPath: templatePath,
            extName: '.hbs'
        };
        emailOptions[lang] = options;
    }

    //=========== SMS
    loadSmsTemplates(Model);
}

function loadSmsTemplates(Model) {
    Model.SmsTemplates = {};
    for (var lang in app.settings.locale.allowed) {
        var templates = {};
        var tmplPath = path.join(__dirname, '..', '..', '..', 'common', 'templates', lang, 'sms');
        NotificationConstants.SmsType.enums.forEach(function (type) {
            try {
                var fileContent = fs.readFileSync(path.join(tmplPath, type.value + ".txt"), {encoding: "utf8"});
                templates[type.value] = smsCompiler(fileContent, true);
            } catch (e) {
            }
        });

        Model.SmsTemplates[lang] = templates;
    }
}

function defCallback(err, result) {
}

function setupMQ(Model) {
    Model.EmailQ = MQ('notification:email', app.settings.notification.redis.port, app.settings.notification.redis.host, app.settings.notification.redis);
    Model.EmailQ.process(function (job, done) {
        var data = job.data;
        sendEmail(data.from, data.to, data.type, data.locals, done);
    });
    Model.EmailQ.on('completed', function (job, result) {
        app.models.NotificationMQPersister.PersistJobCompleted(job, result, 'notification:email', defCallback);
    });
    Model.EmailQ.on('failed', function (job, error) {
        app.models.NotificationMQPersister.PersistJobFailure(job, error, 'notification:email', defCallback);
    });
    Model.EmailQ.on('error', function (error) {
        app.models.NotificationMQPersister.PersistJobError(error, 'notification:email', defCallback);
    });


    Model.SMSQ = MQ('notification:sms', app.settings.notification.redis.port, app.settings.notification.redis.host, app.settings.notification.redis);
    Model.SMSQ.process(function (job, done) {
        var data = job.data;
        sendSms(data.to, data.type, data.locals, Model.SmsTemplates[app.i18n.getLocale()][data.type], done);
    });
    Model.SMSQ.on('completed', function (job, result) {
        app.models.NotificationMQPersister.PersistJobCompleted(job, result, 'notification:sms', defCallback);
    });
    Model.SMSQ.on('failed', function (job, error) {
        app.models.NotificationMQPersister.PersistJobFailure(job, error, 'notification:sms', defCallback);
    });
    Model.SMSQ.on('error', function (error) {
        app.models.NotificationMQPersister.PersistJobError(error, 'notification:sms', defCallback);
    });
}

function sendEmail(from, to, type, locals, cb) {
    cb = cb || Common.PromiseCallback();

    getEmailService(app.i18n.getLocale()).sendOne(from, to,
        app.i18n.__(`notification.email.${type}.subject`), type, locals).then((result) => {
        debugEmail("Notification sent to : %s", to);
        cb(null, result);
    }).catch((e) => {
        debugEmail("Notification sending failed : %j", e);
        cb(e)
    });

    return cb.promise;
}

function sendSms(to, type, locals, template, cb) {
    cb = cb || Common.PromiseCallback();

    if (!template) return cb(Notification.SmsErrorNoTemplate);
    var message = template(locals);

    getSMSService(app.i18n.getLocale()).sendOne(null, to, message).then((result) => {
        debugSms("Notification sent to : %s", to);
        cb(null, result);
    }).catch((e) => {
        cb(e)
    });

    return cb.promise;
}

function addServices(Model) {

    /**
     * Add sending email job to queue
     * @param {Object} options
     * @param {String} options.notificationType
     * @param {String} options.from Email from
     * @param {String} options.to Email to
     * @param {String} options.type Email type like "account_registration"
     * @param {Object} options.locals Values to be injected to email template
     * @param {String} options.accountId
     * @param {Callback} cb
     * @memberOf NotificationMQ
     */
    Model.AddEmailJob = function (options, cb) {
        Model.EmailQ.add(options, {attempts: 10, backoff: {type: 'fixed', delay: 30000}}).then((job) => {
            app.models.NotificationMQPersister.PersistNewJob(job, NotificationConstants.NoteType.Email.value, options.type, 'notification:email', cb);
        }).catch((e) => {
            cb(e);
        });
    };

    /**
     * Add sending sms job to queue
     * @param {Object} options
     * @param {String} options.notificationType
     * @param {String} options.to Phone number to
     * @param {String} options.type SMS type like "account_registration"
     * @param {Object} options.locals Values to be injected to sms template
     * @param {String} options.accountId
     * @param {Callback} cb
     * @memberOf NotificationMQ
     */
    Model.AddSMSJob = function (options, cb) {
        Model.SMSQ.add(options, {attempts: 10, backoff: {type: 'fixed', delay: 30000}}).then((job) => {
            app.models.NotificationMQPersister.PersistNewJob(job, NotificationConstants.NoteType.SMS.value, options.type, 'notification:sms', cb);
            cb(null, job);
        }).catch((e) => {
            cb(e);
        });
    };
}
