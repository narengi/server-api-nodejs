//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

require('enum').register();

module.exports = exports;

exports.NoteTypes = new Enum({
    "Email": "email",
    "SMS": "sms",
    "PushMobileGCM": "push_mobile_gcm",
    "PushMobileAPN": "push_mobile_apn"
}, {
    ignoreCase: true,
    freez: true
});

//NOTE that "to" means that this notification is to be sent to
exports.EmailType = new Enum({
    "AccountRegistration": "account_registration",
    "ResetPassword": "reset_password",
    "AccountRequestVerification": "account_request_verification",
    "AccountVerified": "account_verified",
    "BookRequestIssuedToHost": "book_req_issued_to_host",
    "BookRequestCanceledToHost": "book_req_canceled_to_host",
    "BookRequestRejectedToGuest": "book_req_rejected_to_guest",
    "BookRequestRejectAcceptedToGuest": "book_req_reject_accepted_to_guest",
    "BookRequestRejectPaidToGuest": "book_req_reject_paid_to_guest",
    "BookRequestAcceptedToGuest": "book_req_accepted_to_guest",
    "BookRequestPaymentToHost": "book_req_payment_to_host",
    "BookRequestPaymentToGuest": "book_req_payment_to_guest",
    "BookRequestConfirmToGuest": "book_req_confirm_to_guest",
    "BokRequestSettlementToGuest": "book_req_settlement_to_guest",
    "BokRequestSettlementToHost": "book_req_settlement_to_host"
}, {
    ignoreCase: true,
    freez: true
});

//NOTE that "to" means that this notification is to be sent to
exports.SmsType = new Enum({
    "AccountRegistration": "account_registration",
    "ResetPassword": "reset_password",
    "AccountRequestVerification": "account_request_verification",
    "AccountVerified": "account_verified",
    "BookRequestIssuedToHost": "book_req_issued_to_host",
    "BookRequestCanceledToHost": "book_req_canceled_to_host",
    "BookRequestRejectedToGuest": "book_req_rejected_to_guest",
    "BookRequestRejectAcceptedToGuest": "book_req_reject_accepted_to_guest",
    "BookRequestRejectPaidToGuest": "book_req_reject_paid_to_guest",
    "BookRequestAcceptedToGuest": "book_req_accepted_to_guest",
    "BookRequestPaymentToHost": "book_req_payment_to_host",
    "BookRequestPaymentToGuest": "book_req_payment_to_guest",
    "BookRequestConfirmToGuest": "book_req_confirm_to_guest",
    "BokRequestSettlementToGuest": "book_req_settlement_to_guest",
    "BokRequestSettlementToHost": "book_req_settlement_to_host"
}, {
    ignoreCase: true,
    freez: true
});