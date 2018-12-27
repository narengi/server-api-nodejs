//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var nodePath = require('path');
var underscore = require('underscore');

module.exports = function (Image) {

    /**
     * This is just an data holder and not be an independent persistent
     **/

    Image.MakeFromFormidable = function (root, file) {
        if(!file){
            return {};
        }

        return {
            filename: file.name,
            size: file.size,
            type: file.type
        };
    };

    /**
     * Converts an array to result array
     * This is just an data holder and not be an independent persistent
     **/

    Image.MakeFromFormidableArray = function (root, files) {
        if(!files){
            return [];
        }

        return underscore.map(files, function(file){
            return {
                filename: file.name,
                size: file.size,
                type: file.type
            };
        });
    };


    /**
     * Converts db images to api images
     * @param files
     * @constructor
     */
    Image.MakeFromDbArray = function(files){
        if(!files){
            return [];
        }
        return underscore.map(files, function(file){
            return {
                filename: file.filename,
                size: file.size,
                type: file.type
            };
        });
    };
};