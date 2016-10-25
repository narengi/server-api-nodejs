//
// Author : Ebrahim Pasbani (e.pasbani@gmail.com)
//

var nodePath = require('path');
var app = serverRequire('server');
var Http = require('narengi-utils').Http;
var FileSystem = require('narengi-utils').FileSystem;
var underscore = require('underscore');

/**
 * This model (`HouseImageContainer`) is responsible for managing images of `House`
 * All remote methods should be served through `House`
 * @class
 * @param  {Model} HouseImageContainer
 */
module.exports = function (HouseImageContainer) {
    defineAttributes(HouseImageContainer);
    addMethods(HouseImageContainer);
    addServices(HouseImageContainer);
};

function defineAttributes(HouseImageContainer) {
    HouseImageContainer.Config = {};
    HouseImageContainer.Config.Dir = app.settings.house.picture.dirName || "house-images";
    HouseImageContainer.Config.Root = app.settings.house.picture.root;
    HouseImageContainer.Config.Styles = app.settings.house.picture.styles;
    HouseImageContainer.Config.MaxSize = app.settings.house.picture.maxSize;
}

/**
 * Add static methods for `HouseImageContainer`
 * @param {Model} HouseImageContainer
 */
function addMethods(HouseImageContainer) {

    /**
     * Returns physical path for house to save picture
     * @param  {string} houseId
     */
    HouseImageContainer.getPathFor = function (houseId) {
        return nodePath.join(this.Config.Root, this.DirName(this.Config), houseId);
    };
}


/**
 * Add services to be used in `House` model
 * @param {Model} HouseImageContainer
 */
function addServices(HouseImageContainer) {

    /**
     * Uploads a file with specific attributes like filename and destination path and remote field name
     * @param {House} house
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @return {Promise}
     */
    HouseImageContainer.UploadPicture = function (house, httpCtx, options) {
        options = options || {};

        options["destDir"] = this.getPathFor(house.id.toString());
        options["fieldName"] = "picture";

        return this.super_.UploadPicture(httpCtx, options, this.Config);
    };

    /**
     * Uploads multiple files with specific attributes like filename and destination path and remote field name
     * @param {House} house
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @return {Promise}
     */
    HouseImageContainer.UploadPictureAll = function (house, httpCtx, options) {
        options = options || {};

        options["destDir"] = this.getPathFor(house.id.toString());
        options["fieldName"] = "picture[]";

        return this.super_.UploadPictureAll(httpCtx, options, this.Config);
    };

    /**
     * Download profile picture service
     * @param {House} house
     * @param {string} hash File hash
     * @param {String} style
     * @param {HttpContext} httpCtx
     * @return Nothing
     * @throws `Filesystem.Errors.FileNotFound` if user is not valid or not having a picture in its profile
     */
    HouseImageContainer.DownloadPicture = function (house, hash, style, httpCtx) {
        this.super_.DownloadPicture(this.getPathFor(house.id.toString()), house.pictures, hash, style, httpCtx, this.Config);
    };
}