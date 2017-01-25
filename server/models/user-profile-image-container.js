//
// Author : Ali Abbasinasab (a.abbasinasab@gmail.com)
//

var nodePath = require('path');
var app = serverRequire('server');
var fsExtra = require('fs-extra');


/**
 * This model (`UserProfileImageContainer`) is responsible for managing files of `UserProfile`
 * All remote methods should be served through `UserProfile`
 * @class
 * @param  {object} UserProfileImageContainer
 */


module.exports = function (UserProfileImageContainer) {
    defineAttributes(UserProfileImageContainer);
    addMethods(UserProfileImageContainer);
    addServices(UserProfileImageContainer);
};

function defineAttributes(UserProfileImageContainer) {
    UserProfileImageContainer.Config = {};
    UserProfileImageContainer.Config.Dir = app.settings.userProfile.picture.dirName || "user-profile-images";
    UserProfileImageContainer.Config.Root = app.settings.userProfile.picture.root;
    UserProfileImageContainer.Config.Styles = app.settings.userProfile.picture.styles;
    UserProfileImageContainer.Config.MaxSize = app.settings.userProfile.picture.maxSize;
}

/**
 * Add static methods for `UserProfileImageContainer`
 * @param {object} UserProfileImageContainer
 */
function addMethods(UserProfileImageContainer) {

    /**
     * Returns physical path for user to save picture
     * @return {Promise}   resolve(path), reject(Error)
     * @param userId
     */
    UserProfileImageContainer.getPathFor = function (userId) {
        return nodePath.join(__dirname, '..', '..', this.Config.Root, this.DirName(this.Config), userId);
    };
};

/**
 * Add services to be used in `UserProfile` model
 * @param {object} UserProfileImageContainer
 */
function addServices(UserProfileImageContainer) {

    /**
     * Uploads a file with specific attributes like filename and destination path and remote field name
     * @param {Account} user
     * @param {HttpContext} httpCtx
     * @param {object} options
     * @constructor
     * @return {Promise}
     */
    UserProfileImageContainer.UploadPicture = function (user, httpCtx, options) {
        options = options || {};

        options["destDir"] = this.getPathFor(user.id.toString());
        options["fieldName"] = "picture";

        var self = this;

        return new Promise(function (resolve, reject) {
            fsExtra.emptyDir(options["destDir"], function (err) {
                if (err) return reject(err);
                self.super_.UploadPicture(httpCtx, options, self.Config).then((result) => {
                    resolve(result);
                }).catch((e) => {
                    reject(e);
                });
            });
        });
    };

    /**
     * Download profile picture service
     * @param {Account} user
     * @param {String} hash
     * @param {String} style
     * @param {HttpContext} httpCtx
     * @throws FilesysteError.FileNotFound if user is not valid or not having a picture in its profile
     */
    UserProfileImageContainer.DownloadPicture = function (user, hash, style, httpCtx) {
        if (user.profile.value() && user.profile.value().picture) {
            var picture = user.profile.value().picture;
            this.super_.DownloadPicture(this.getPathFor(user.id.toString()), [picture], hash, style, httpCtx, this.Config);
        }
        else {
            this.NotFound(httpCtx);
        }
    };
};