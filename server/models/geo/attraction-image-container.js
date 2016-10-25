//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var nodePath = require('path');
var app = serverRequire('server');
var downloader = require('narengi-utils').Http.Downloader;
var FilesysteError = require('narengi-utils').FileSystem.Errors;
var underscore = require('underscore');

/**
 * This model (`AttractionImageContainer`) is responsible for managing images of `Attraction`
 * All remote methods should be served through `Attraction`
 * @class
 * @param  {AttractionImageContainer} AttractionImageContainer
 */

module.exports = function (AttractionImageContainer) {
    defineAttributes(AttractionImageContainer);
    addMethods(AttractionImageContainer);
    addServices(AttractionImageContainer);
};

function defineAttributes(AttractionImageContainer) {
    AttractionImageContainer.Config = {};
    AttractionImageContainer.Config.Dir = app.settings.attraction.picture.dirName || "attraction-images";
    AttractionImageContainer.Config.Root = app.settings.attraction.picture.root;
    AttractionImageContainer.Config.Styles = app.settings.attraction.picture.styles;
    AttractionImageContainer.Config.MaxSize = app.settings.attraction.picture.maxSize;
}


/**
 * Add static methods for `AttractionImageContainer`
 * @param {AttractionImageContainer} AttractionImageContainer
 */
function addMethods(AttractionImageContainer) {

    /**
     * Returns physical path for attraction to save picture
     * @param  {string} attractionId
     * @return {Promise}   resolve(path), reject(Error)
     */
    AttractionImageContainer.getPathFor = function (attractionId) {
        return nodePath.join(this.Config.Root, this.DirName(this.Config), attractionId);
    };
};

/**
 * Add services to be used in `Attraction` model
 * @param {object} AttractionImageContainer
 */
function addServices(AttractionImageContainer) {

    /**
     * Uploads a file with specific attributes like filename and destination path and remote field name
     * @param {Attraction} attraction
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @return {Promise}
     */
    AttractionImageContainer.UploadPicture = function (attraction, httpCtx, options) {
        options = options || {};

        options["destDir"] = this.getPathFor(attraction.id.toString());
        options["fieldName"] = "picture";

        return this.super_.UploadPicture(httpCtx, options, this.Config);
    };

    /**
     * Uploads multiple files with specific attributes like filename and destination path and remote field name
     * @param {Attraction} attraction
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @return {Promise}
     */
    AttractionImageContainer.UploadPictureAll = function (attraction, httpCtx, options) {
        options = options || {};

        options["destDir"] = this.getPathFor(attraction.id.toString());
        options["fieldName"] = "picture[]";

        return this.super_.UploadPictureAll(httpCtx, options, this.Config);
    };

    /**
     * Download profile picture service
     * @param {Attraction} attraction
     * @param hash
     * @param style
     * @param {HttpContext} httpCtx
     * @return Nothing
     * @throws FilesysteError.FileNotFound if user is not valid or not having a picture in its profile
     */
    AttractionImageContainer.DownloadPicture = function (attraction, hash, style, httpCtx) {
        this.super_.DownloadPicture(this.getPathFor(attraction.id.toString()), attraction.pictures, hash, style, httpCtx, this.Config);
    };
}