//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var errorConverter = require('./middleware/error-converter');

module.exports = {
    remoting: {
        errorHandler: {
            handler: errorConverter()
        }
    }
};