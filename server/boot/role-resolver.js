//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

module.exports = function(app) {

    /**
     * Loads all boot scripts in `roles` folder.
     **/

    var normalizedPath = require("path").join(__dirname, "roles");

    require("fs").readdirSync(normalizedPath).forEach(function(file) {
        require("./roles/" + file)(app);
    });
};