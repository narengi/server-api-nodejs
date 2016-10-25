//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var moment = require('moment');
var Enum = require('enum');
var path = require('path');
var fs = require('fs');
var Common = require('narengi-utils').Common;
var app = serverRequire('server');
var NotificationConstants = require('../../../common/constants/notification-constants');

module.exports = function (Notification) {
    defineConstants(Notification);
    definePersistencyServices(Notification);
    defineBizServices(Notification);
    defineRemotMethods(Notification);
};

function definePersistencyServices(Notification) {

    Notification.Create = function (data, cb) {
        cb = cb || Common.PromiseCallback();
        if (!data.date)
            data.date = moment.utc().toDate();
        Notification.create(data, cb);
        return cb.promise;
    }
}

function defineBizServices(Notification) {

    function sendEmail(type, to, account, locals, cb) {
        cb = cb || Common.PromiseCallback();

        account = account || {};
        to = to || account.email;
        if (!to) return cb(Notification.EmailErrorNoReceiver);

        var options = {
            notificationType: NotificationConstants.NoteType.Email.value,
            from: app.settings.notification.email.default,
            to: to,
            type: type.value,
            locals: locals,
            accountId: account.id,
        };

        app.models.NotificationMQ.AddEmailJob(options, cb);

        return cb.promise;
    }
    NotificationConstants.EmailType.enums.forEach(function (type) {
        Notification["SendEmail" + type.key] = function () {
            return sendEmail(type, ...arguments);
        };
    });

    //=======================================================================================

    function sendSms(type, to, account, locals, cb) {
        cb = cb || Common.PromiseCallback();

        account = account || {};
        to = to || account.cellNumber;
        if (!to) return cb(Notification.SmsErrorNoReceiver);

        var options = {
            notificationType: NotificationConstants.NoteType.SMS.value,
            to: to,
            type: type.value,
            locals: locals,
            accountId: account.id
        };

        app.models.NotificationMQ.AddSMSJob(options, cb);

        return cb.promise;
    }

    NotificationConstants.SmsType.enums.forEach(function (type) {
        Notification["SendSms" + type.key] = function () {
            return sendSms(type, ...arguments);
        };
    });
}

function defineRemotMethods(Notification) {

}

function defineConstants(Notification) {

    Notification.EmailErrorNoReceiver = Common.Errors.InternalError({message: 'notification.email.error.no-receiver'});
    Notification.SmsErrorNoReceiver = Common.Errors.InternalError({message: 'notification.sms.error.no-receiver'});
    Notification.SmsErrorNoTemplate = Common.Errors.InternalError({message: 'notification.sms.error.no-template'});
}