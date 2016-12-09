//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//


var nodeMime = require('mime');
var nodeFs = require('fs');

module.exports = exports;

/**
 * Sends file in http response.
 * @param {HttpResponse} res
 * @param {string} filename filename to be sent to client
 * @param {string} filepath Absolute file path
 */
exports.download = function(res, filename, filepath){

    var mimetype = nodeMime.lookup(filepath);

    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);

    switch (mimetype) {
    	case 'image/jpeg': 
    		let fileToLoad = nodeFs.readFileSync(filepath);
    		res.writeHead(200, {'Content-Type':  mimetype });
    		res.end(fileToLoad, 'binary');
    	break;
    	default:
		    var filestream = nodeFs.createReadStream(filepath);
		    filestream.pipe(res);
    }
};