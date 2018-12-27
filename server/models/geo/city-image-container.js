//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var nodePath = require('path');
var app = serverRequire('server');
var downloader = require('narengi-utils').Http.Downloader;
var FilesysteError = require('narengi-utils').FileSystem.Errors;
var underscore = require('underscore');


/**
 * This model (`CityImageContainer`) is responsible for managing images of `City`
 * All remote methods should be served through `City`
 * @class
 * @param  {CityImageContainer} CityImageContainer
 */
module.exports = function (CityImageContainer) {
    defineAttributes(CityImageContainer);
    addMethods(CityImageContainer);
    addServices(CityImageContainer);
};

function defineAttributes(CityImageContainer) {
    CityImageContainer.Config = {};
    CityImageContainer.Config.Dir = app.settings.city.picture.dirName || "city-images";
    CityImageContainer.Config.Root = app.settings.city.picture.root;
    CityImageContainer.Config.Styles = app.settings.city.picture.styles;
    CityImageContainer.Config.MaxSize = app.settings.city.picture.maxSize;
}

/**
 * Add static methods for `CityImageContainer`
 * @param {CityImageContainer} CityImageContainer
 */
function addMethods(CityImageContainer) {

    /**
     * Returns physical path for city to save picture
     * @param  {string} cityId
     * @return {Promise}   resolve(path), reject(Error)
     */
    CityImageContainer.getPathFor = function (cityId) {
        return nodePath.join(this.Config.Root, this.DirName(this.Config), cityId);
    };
};

/**
 * Add services to be used in `City` model
 * @param {object} CityImageContainer
 */
function addServices(CityImageContainer) {

    /**
     * Uploads a file with specific attributes like filename and destination path and remote field name
     * @param {City} city
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @return {Promise}
     */
    CityImageContainer.UploadPicture = function (city, httpCtx, options) {
        options = options || {};

        options["destDir"] = this.getPathFor(city.id.toString());
        options["fieldName"] = "picture";

        return this.super_.UploadPicture(httpCtx, options, this.Config);
    };

    /**
     * Uploads multiple files with specific attributes like filename and destination path and remote field name
     * @param {City} city
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @return {Promise}
     */
    CityImageContainer.UploadPictureAll = function (city, httpCtx, options) {
        options = options || {};

        options["destDir"] = this.getPathFor(city.id.toString());
        options["fieldName"] = "picture[]";

        return this.super_.UploadPictureAll(httpCtx, options, this.Config);
    };

    /**
     * Download profile picture service
     * @param {City} city
     * @param hash
     * @param style
     * @param {HttpContext} httpCtx
     * @return Nothing
     * @throws FilesysteError.FileNotFound if user is not valid or not having a picture in its profile
     */
    CityImageContainer.DownloadPicture = function (city, hash, style, httpCtx) {
        this.super_.DownloadPicture(this.getPathFor(city.id.toString()), city.pictures, hash, style, httpCtx, this.Config);
    };
}