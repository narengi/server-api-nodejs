//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var promiseCallback = require('narengi-utils').Common.PromiseCallback;
var Persistency = require('narengi-utils').Persistency;
var app = serverRequire('server');

module.exports = function(Person) {
    Person.GetByAccountId = function(accountId, cb){
        cb = cb || promiseCallback();
        app.models.Account.findById(accountId).then(accountFoundHandler(cb)).catch(accountErrorHandler(cb));
        return cb.promise;

        function accountFoundHandler(callback){
            return function(account){
                if(!account){
                    return accountErrorHandler(callback)(Persistency.Errors.NotFound());
                }
                account.person(callback);
            }
        }

        function accountErrorHandler(callback){
            return function(err){
                callback(err);
            }
        }
    }
};
