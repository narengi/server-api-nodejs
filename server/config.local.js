//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var errorConverter = require('./middleware/error-converter');

module.exports = {
    remoting: {
        errorHandler: {
            handler: errorConverter()
        }
    }
};